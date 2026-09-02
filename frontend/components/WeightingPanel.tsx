"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  getDimensions,
  getIndicators,
  getWeighting,
  saveWeighting,
  type DimensionRecord,
  type IndexRecord,
  type IndicatorRecord,
  type WeightingMethod,
} from "../lib/api";

import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { StatusMessage } from "./ui/StatusMessage";


type WeightingPanelProps = {
  selectedIndex: IndexRecord | null;
  methodologyVersion: number;
  onMethodologyChange: () => void;
};


type PercentageMap = Record<
  string,
  number
>;


type IndicatorGroup = {
  dimension: DimensionRecord;
  indicators: IndicatorRecord[];
};


export function WeightingPanel({
  selectedIndex,
  methodologyVersion,
  onMethodologyChange,
}: WeightingPanelProps) {
  const [method, setMethod] =
    useState<WeightingMethod>("equal");

  const [
    dimensions,
    setDimensions,
  ] = useState<DimensionRecord[]>([]);

  const [
    indicatorGroups,
    setIndicatorGroups,
  ] = useState<IndicatorGroup[]>([]);

  const [
    dimensionWeights,
    setDimensionWeights,
  ] = useState<PercentageMap>({});

  const [
    indicatorWeights,
    setIndicatorWeights,
  ] = useState<PercentageMap>({});

  const [isLoading, setIsLoading] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");


  useEffect(() => {
    if (!selectedIndex) {
      return;
    }

    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);

      try {
        const loadedDimensions =
          await getDimensions(
            selectedIndex!.slug,
          );

        const groups =
          await Promise.all(
            loadedDimensions.map(
              async (dimension) => ({
                dimension,
                indicators:
                  await getIndicators(
                    selectedIndex!.slug,
                    dimension.id,
                  ),
              }),
            ),
          );

        const existing =
          await getWeighting(
            selectedIndex!.slug,
          );

        if (cancelled) {
          return;
        }

        setDimensions(
          loadedDimensions,
        );

        setIndicatorGroups(groups);

        if (
          existing?.method === "custom"
        ) {
          setMethod("custom");

          setDimensionWeights(
            convertStoredWeights(
              existing.config
                .dimension_weights,
            ),
          );

          setIndicatorWeights(
            convertStoredWeights(
              existing.config
                .indicator_weights,
            ),
          );
        } else {
          setMethod("equal");

          setDimensionWeights(
            createEqualDimensionWeights(
              loadedDimensions,
            ),
          );

          setIndicatorWeights(
            createEqualIndicatorWeights(
              groups,
            ),
          );
        }

        setError("");
        setMessage("");
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load weighting.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    selectedIndex,
    methodologyVersion,
  ]);


  function switchMethod(
    nextMethod: WeightingMethod,
  ): void {
    setMethod(nextMethod);
    setError("");
    setMessage("");

    if (nextMethod === "equal") {
      setDimensionWeights(
        createEqualDimensionWeights(
          dimensions,
        ),
      );

      setIndicatorWeights(
        createEqualIndicatorWeights(
          indicatorGroups,
        ),
      );
    }
  }


  function updateDimensionWeight(
    id: string,
    value: number,
  ): void {
    setDimensionWeights(
      (current) => ({
        ...current,
        [id]: value,
      }),
    );
  }


  function updateIndicatorWeight(
    id: string,
    value: number,
  ): void {
    setIndicatorWeights(
      (current) => ({
        ...current,
        [id]: value,
      }),
    );
  }


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedIndex) {
      return;
    }

    setError("");
    setMessage("");

    if (
      method === "custom" &&
      !customWeightsAreValid(
        dimensions,
        indicatorGroups,
        dimensionWeights,
        indicatorWeights,
      )
    ) {
      setError(
        "Every weighting group must total 100%.",
      );

      return;
    }

    setIsSaving(true);

    try {
      await saveWeighting(
        selectedIndex.slug,
        {
          method,

          dimension_weights:
            method === "custom"
              ? dimensions.map(
                  (dimension) => ({
                    id: dimension.id,
                    weight:
                      (
                        dimensionWeights[
                          dimension.id
                        ] ?? 0
                      ) / 100,
                  }),
                )
              : [],

          indicator_weights:
            method === "custom"
              ? indicatorGroups.flatMap(
                  (group) =>
                    group.indicators.map(
                      (indicator) => ({
                        id: indicator.id,
                        weight:
                          (
                            indicatorWeights[
                              indicator.id
                            ] ?? 0
                          ) / 100,
                      }),
                    ),
                )
              : [],
        },
      );

      setMessage(
        method === "equal"
          ? "Equal weighting saved."
          : "Custom weighting saved.",
      );

      onMethodologyChange();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save weighting.",
      );
    } finally {
      setIsSaving(false);
    }
  }


  if (!selectedIndex) {
    return (
      <StatusMessage
        type="empty"
        title="No index selected"
        message="Open an index before configuring weighting."
      />
    );
  }


  if (isLoading) {
    return (
      <StatusMessage
        type="loading"
        title="Loading weighting…"
      />
    );
  }


  if (dimensions.length === 0) {
    return (
      <StatusMessage
        type="empty"
        title="No dimensions"
        message="Add dimensions before configuring weighting."
      />
    );
  }


  const dimensionTotal = totalOf(
    dimensions.map(
      (dimension) =>
        dimensionWeights[
          dimension.id
        ] ?? 0,
    ),
  );


  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: "var(--aix-space-lg)",
      }}
    >
      <div>
        <h3
          style={{
            marginTop: 0,
          }}
        >
          Weighting method
        </h3>

        <p
          style={{
            color:
              "var(--aix-color-text-muted)",
          }}
        >
          Choose how much each dimension
          and indicator contributes to the
          final index.
        </p>
      </div>


      <section
        style={{
          padding: "var(--aix-space-md)",
          border:
            "1px solid var(--aix-color-border)",
          borderRadius:
            "var(--aix-radius-sm)",
          background:
            "var(--aix-color-surface)",
        }}
      >
        <strong>
          Selected methodology:{" "}
          {method === "equal"
            ? "Equal weighting"
            : "Custom weighting"}
        </strong>

        <p
          style={{
            margin:
              "var(--aix-space-sm) 0 0",
            color:
              "var(--aix-color-text-muted)",
            fontSize: "13px",
          }}
        >
          {method === "equal"
            ? "Each dimension receives an equal share of the index weight, and indicators are equally weighted within their dimension."
            : "The percentages below are the explicit dimension and indicator weights used when this configuration is saved."}
        </p>

        <div
          style={{
            display: "grid",
            gap: "6px",
            marginTop:
              "var(--aix-space-sm)",
            fontSize: "13px",
          }}
        >
          {dimensions.map((dimension) => (
            <div key={dimension.id}>
              <strong>{dimension.name}:</strong>{" "}
              {formatWeightPercentage(
                dimensionWeights[
                  dimension.id
                ] ?? 0,
              )}
              {indicatorGroups
                .find(
                  (group) =>
                    group.dimension.id ===
                    dimension.id,
                )
                ?.indicators.map(
                  (indicator) => (
                    <span key={indicator.id}>
                      {" · "}
                      {indicator.name}{" "}
                      {formatWeightPercentage(
                        indicatorWeights[
                          indicator.id
                        ] ?? 0,
                      )}
                    </span>
                  ),
                )}
            </div>
          ))}
        </div>
      </section>


      {error && (
        <StatusMessage
          type="error"
          title="Weighting error"
          message={error}
        />
      )}


      {message && (
        <StatusMessage
          type="success"
          title={message}
        />
      )}


      <fieldset
        style={{
          border: 0,
          padding: 0,
          margin: 0,
          display: "grid",
          gap: "var(--aix-space-sm)",
        }}
      >
        <legend
          style={{
            fontWeight: 700,
            marginBottom:
              "var(--aix-space-sm)",
          }}
        >
          Method
        </legend>

        <label>
          <input
            type="radio"
            name="weighting-method"
            value="equal"
            checked={method === "equal"}
            onChange={() =>
              switchMethod("equal")
            }
          />{" "}
          Equal weighting
        </label>

        <label>
          <input
            type="radio"
            name="weighting-method"
            value="custom"
            checked={method === "custom"}
            onChange={() =>
              switchMethod("custom")
            }
          />{" "}
          Custom weighting
        </label>
      </fieldset>


      {method === "equal" ? (
        <StatusMessage
          type="success"
          title="Equal weighting"
          message="AIX will give every dimension equal weight, and every indicator within each dimension equal weight."
        />
      ) : (
        <>
          <WeightGroup
            title="Dimensions"
            total={dimensionTotal}
          >
            {dimensions.map(
              (dimension) => (
                <WeightInput
                  key={dimension.id}
                  id={`dimension-weight-${dimension.id}`}
                  label={dimension.name}
                  value={
                    dimensionWeights[
                      dimension.id
                    ] ?? 0
                  }
                  onChange={(value) =>
                    updateDimensionWeight(
                      dimension.id,
                      value,
                    )
                  }
                />
              ),
            )}
          </WeightGroup>


          {indicatorGroups.map(
            (group) => {
              if (
                group.indicators.length ===
                0
              ) {
                return (
                  <StatusMessage
                    key={
                      group.dimension.id
                    }
                    type="empty"
                    title={
                      group.dimension.name
                    }
                    message="This dimension has no indicators."
                  />
                );
              }

              const groupTotal = totalOf(
                group.indicators.map(
                  (indicator) =>
                    indicatorWeights[
                      indicator.id
                    ] ?? 0,
                ),
              );

              return (
                <WeightGroup
                  key={
                    group.dimension.id
                  }
                  title={`${group.dimension.name} indicators`}
                  total={groupTotal}
                >
                  {group.indicators.map(
                    (indicator) => (
                      <WeightInput
                        key={
                          indicator.id
                        }
                        id={`indicator-weight-${indicator.id}`}
                        label={
                          indicator.name
                        }
                        value={
                          indicatorWeights[
                            indicator.id
                          ] ?? 0
                        }
                        onChange={(
                          value,
                        ) =>
                          updateIndicatorWeight(
                            indicator.id,
                            value,
                          )
                        }
                      />
                    ),
                  )}
                </WeightGroup>
              );
            },
          )}
        </>
      )}


      <div>
        <Button
          type="submit"
          isLoading={isSaving}
        >
          Save weighting
        </Button>
      </div>
    </form>
  );
}


function WeightGroup({
  title,
  total,
  children,
}: {
  title: string;
  total: number;
  children: React.ReactNode;
}) {
  const valid = totalsMatch(total, 100);

  return (
    <section
      style={{
        padding:
          "var(--aix-space-md)",
        border:
          "1px solid var(--aix-color-border)",
        borderRadius:
          "var(--aix-radius-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "baseline",
          gap: "var(--aix-space-md)",
          marginBottom:
            "var(--aix-space-md)",
        }}
      >
        <h4
          style={{
            margin: 0,
          }}
        >
          {title}
        </h4>

        <strong>
          Total:{" "}
          {formatPercentage(total)}%
          {valid ? " ✓" : ""}
        </strong>
      </div>

      <div
        style={{
          display: "grid",
          gap: "var(--aix-space-sm)",
        }}
      >
        {children}
      </div>
    </section>
  );
}


function WeightInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(0, 1fr) 120px",
        gap: "var(--aix-space-md)",
        alignItems: "end",
      }}
    >
      <div
        style={{
          paddingBottom: "10px",
        }}
      >
        <label htmlFor={id}>
          {label}
        </label>
      </div>

      <Input
        id={id}
        name={id}
        label="Weight (%)"
        type="number"
        min="0"
        max="100"
        step="0.01"
        required
        value={String(value)}
        onChange={(event) => {
          const nextValue =
            Number(event.target.value);

          onChange(
            Number.isFinite(nextValue)
              ? nextValue
              : 0,
          );
        }}
      />
    </div>
  );
}


function createEqualDimensionWeights(
  dimensions: DimensionRecord[],
): PercentageMap {
  if (dimensions.length === 0) {
    return {};
  }

  const weight =
    100 / dimensions.length;

  return Object.fromEntries(
    dimensions.map(
      (dimension) => [
        dimension.id,
        weight,
      ],
    ),
  );
}


function createEqualIndicatorWeights(
  groups: IndicatorGroup[],
): PercentageMap {
  const weights: PercentageMap = {};

  for (const group of groups) {
    if (
      group.indicators.length === 0
    ) {
      continue;
    }

    const weight =
      100 / group.indicators.length;

    for (
      const indicator
      of group.indicators
    ) {
      weights[indicator.id] =
        weight;
    }
  }

  return weights;
}


function convertStoredWeights(
  weights:
    | Record<string, number>
    | undefined,
): PercentageMap {
  if (!weights) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(weights).map(
      ([id, weight]) => [
        id,
        weight * 100,
      ],
    ),
  );
}


function customWeightsAreValid(
  dimensions: DimensionRecord[],
  groups: IndicatorGroup[],
  dimensionWeights: PercentageMap,
  indicatorWeights: PercentageMap,
): boolean {
  const dimensionTotal = totalOf(
    dimensions.map(
      (dimension) =>
        dimensionWeights[
          dimension.id
        ] ?? 0,
    ),
  );

  if (
    !totalsMatch(
      dimensionTotal,
      100,
    )
  ) {
    return false;
  }

  return groups.every((group) => {
    if (
      group.indicators.length === 0
    ) {
      return true;
    }

    const total = totalOf(
      group.indicators.map(
        (indicator) =>
          indicatorWeights[
            indicator.id
          ] ?? 0,
      ),
    );

    return totalsMatch(total, 100);
  });
}


function totalOf(
  values: number[],
): number {
  return values.reduce(
    (total, value) =>
      total + value,
    0,
  );
}


function formatWeightPercentage(
  value: number,
): string {
  return `${value.toFixed(2).replace(/\.00$/, "")}%`;
}


function totalsMatch(
  first: number,
  second: number,
): boolean {
  return (
    Math.abs(first - second) <
    0.001
  );
}


function formatPercentage(
  value: number,
): string {
  return value.toFixed(2).replace(
    /\.?0+$/,
    "",
  );
}