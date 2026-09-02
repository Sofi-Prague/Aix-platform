"use client";

import {
  useCallback,
  useState,
  type ReactNode,
} from "react";

import {
  calculateIndex,
  type CalculatedEntityRecord,
  type IndexCalculationResponse,
  type IndexRecord,
} from "../lib/api";

import { Button } from "./ui/Button";
import { StatusMessage } from "./ui/StatusMessage";


type ResultsPanelProps = {
  selectedIndex: IndexRecord | null;
};


export function ResultsPanel({
  selectedIndex,
}: ResultsPanelProps) {
  const [
    calculation,
    setCalculation,
  ] =
    useState<IndexCalculationResponse | null>(
      null,
    );

  const [
    selectedPeriod,
    setSelectedPeriod,
  ] = useState("");

  const [
    expandedEntity,
    setExpandedEntity,
  ] = useState<string | null>(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    hasLoaded,
    setHasLoaded,
  ] = useState(false);


  const loadResults = useCallback(
    async (): Promise<void> => {
      if (!selectedIndex) {
        return;
      }

      setHasLoaded(true);
      setIsLoading(true);
      setError("");

      try {
        const result =
          await calculateIndex(
            selectedIndex.slug,
          );

        setCalculation(result);

        setSelectedPeriod(
          result.periods.at(-1)?.period ??
            "",
        );

        setExpandedEntity(null);
      } catch (loadError) {
        setCalculation(null);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to calculate index results.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [selectedIndex],
  );


  if (!selectedIndex) {
    return (
      <StatusMessage
        type="empty"
        title="No index selected"
        message="Open an index before viewing results."
      />
    );
  }


  if (!hasLoaded) {
    return (
      <div
        style={{
          display: "grid",
          gap:
            "var(--aix-space-md)",
        }}
      >
        <StatusMessage
          type="empty"
          title="Results not calculated"
          message="Calculate the index to view rankings and score breakdowns."
        />

        <div>
          <Button
            type="button"
            onClick={() =>
              void loadResults()
            }
          >
            Calculate results
          </Button>
        </div>
      </div>
    );
  }


  if (isLoading) {
    return (
      <StatusMessage
        type="loading"
        title="Calculating results"
        message="Normalizing indicator data and calculating index scores."
      />
    );
  }


  if (error) {
    return (
      <div
        style={{
          display: "grid",
          gap:
            "var(--aix-space-md)",
        }}
      >
        <StatusMessage
          type="error"
          title="Results unavailable"
          message={error}
        />

        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              void loadResults()
            }
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }


  if (
    !calculation ||
    calculation.periods.length === 0
  ) {
    return (
      <div
        style={{
          display: "grid",
          gap:
            "var(--aix-space-md)",
        }}
      >
        <StatusMessage
          type="empty"
          title="No results"
          message="There are no calculated results for this index yet."
        />

        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              void loadResults()
            }
          >
            Recalculate
          </Button>
        </div>
      </div>
    );
  }


  const activePeriod =
    calculation.periods.find(
      (period) =>
        period.period ===
        selectedPeriod,
    ) ?? calculation.periods[0];


  return (
    <div
      style={{
        display: "grid",
        gap:
          "var(--aix-space-lg)",
      }}
    >
      <header>
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "start",
            flexWrap: "wrap",
            gap:
              "var(--aix-space-md)",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
              }}
            >
              {calculation.index_name}
            </h3>

            <p
              style={{
                margin:
                  "6px 0 0",
                color:
                  "var(--aix-color-text-muted)",
              }}
            >
              Calculated using{" "}
              <strong>
                {formatWeightingMethod(
                  calculation.weighting_method,
                )}
              </strong>{" "}
              weighting.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={isLoading}
            onClick={() =>
              void loadResults()
            }
          >
            Recalculate
          </Button>
        </div>
      </header>


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
        <strong>Calculation trace</strong>
        <p
          style={{
            margin:
              "var(--aix-space-sm) 0 0",
            color:
              "var(--aix-color-text-muted)",
            fontSize: "13px",
          }}
        >
          Raw value → Normalized value →
          Indicator weight → Indicator
          contribution → Dimension score →
          Dimension weight → Final score.
          Expand any entity below to inspect
          every step.
        </p>
      </section>


      {calculation.periods.length >
        1 && (
        <div
          style={{
            display: "flex",
            gap:
              "var(--aix-space-sm)",
            flexWrap: "wrap",
          }}
        >
          {calculation.periods.map(
            (period) => (
              <Button
                key={period.period}
                type="button"
                variant={
                  activePeriod.period ===
                  period.period
                    ? "primary"
                    : "secondary"
                }
                onClick={() => {
                  setSelectedPeriod(
                    period.period,
                  );

                  setExpandedEntity(
                    null,
                  );
                }}
              >
                {period.period}
              </Button>
            ),
          )}
        </div>
      )}


      <div>
        <h4
          style={{
            margin:
              "0 0 var(--aix-space-md)",
          }}
        >
          Rankings ·{" "}
          {activePeriod.period}
        </h4>

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
            }}
          >
            <thead>
              <tr>
                <TableHeading>
                  Rank
                </TableHeading>

                <TableHeading>
                  Entity
                </TableHeading>

                <TableHeading>
                  Score
                </TableHeading>

                <TableHeading>
                  Details
                </TableHeading>
              </tr>
            </thead>

            <tbody>
              {activePeriod.results.map(
                (result) => (
                  <ResultRow
                    key={
                      result.entity
                    }
                    result={result}
                    expanded={
                      expandedEntity ===
                      result.entity
                    }
                    onToggle={() =>
                      setExpandedEntity(
                        (current) =>
                          current ===
                          result.entity
                            ? null
                            : result.entity,
                      )
                    }
                  />
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function ResultRow({
  result,
  expanded,
  onToggle,
}: {
  result: CalculatedEntityRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr>
        <TableCell>
          <strong>
            #{result.rank}
          </strong>
        </TableCell>

        <TableCell>
          {result.entity}
        </TableCell>

        <TableCell>
          <strong>
            {formatScore(
              result.score,
            )}
          </strong>
        </TableCell>

        <TableCell>
          <Button
            type="button"
            variant="secondary"
            onClick={onToggle}
          >
            {expanded
              ? "Hide"
              : "View"}
          </Button>
        </TableCell>
      </tr>


      {expanded && (
        <tr>
          <td
            colSpan={4}
            style={{
              padding:
                "var(--aix-space-lg)",
              borderBottom:
                "1px solid var(--aix-color-border)",
              background:
                "var(--aix-color-background)",
            }}
          >
            <EntityBreakdown
              result={result}
            />
          </td>
        </tr>
      )}
    </>
  );
}


function EntityBreakdown({
  result,
}: {
  result: CalculatedEntityRecord;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap:
          "var(--aix-space-lg)",
      }}
    >
      <div>
        <strong>
          {result.entity}
        </strong>

        <span
          style={{
            marginLeft:
              "var(--aix-space-sm)",
            color:
              "var(--aix-color-text-muted)",
          }}
        >
          Final score{" "}
          {formatScore(
            result.score,
          )}
          {" · "}
          Sum of weighted dimension
          contributions
        </span>
      </div>


      {result.dimensions.map(
        (dimension) => (
          <section
            key={
              dimension.dimension_id
            }
            style={{
              display: "grid",
              gap:
                "var(--aix-space-sm)",
            }}
          >
            <div>
              <strong>
                {
                  dimension.dimension_name
                }
              </strong>

              <span
                style={{
                  marginLeft:
                    "var(--aix-space-sm)",
                  color:
                    "var(--aix-color-text-muted)",
                }}
              >
                Score{" "}
                {formatScore(
                  dimension.score,
                )}
                {" · "}
                Weight{" "}
                {formatPercentage(
                  dimension.weight,
                )}
                {" · "}
                Contribution{" "}
                {formatScore(
                  dimension.weighted_score,
                )}
              </span>
            </div>


            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                }}
              >
                <thead>
                  <tr>
                    <TableHeading>
                      Indicator
                    </TableHeading>

                    <TableHeading>
                      Raw
                    </TableHeading>

                    <TableHeading>
                      Normalized
                    </TableHeading>

                    <TableHeading>
                      Weight
                    </TableHeading>

                    <TableHeading>
                      Contribution
                    </TableHeading>
                  </tr>
                </thead>

                <tbody>
                  {dimension.indicators.map(
                    (indicator) => (
                      <tr
                        key={
                          indicator.indicator_id
                        }
                      >
                        <TableCell>
                          {
                            indicator.indicator_name
                          }
                        </TableCell>

                        <TableCell>
                          {formatRawValue(
                            indicator.raw_value,
                          )}
                        </TableCell>

                        <TableCell>
                          {formatScore(
                            indicator.normalized_value,
                          )}
                        </TableCell>

                        <TableCell>
                          {formatPercentage(
                            indicator.weight,
                          )}
                        </TableCell>

                        <TableCell>
                          {formatScore(
                            indicator.weighted_score,
                          )}
                        </TableCell>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ),
      )}
    </div>
  );
}


function TableHeading({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th
      style={{
        padding:
          "var(--aix-space-sm)",
        textAlign: "left",
        borderBottom:
          "1px solid var(--aix-color-border)",
        color:
          "var(--aix-color-text-muted)",
        fontSize: "12px",
        textTransform:
          "uppercase",
      }}
    >
      {children}
    </th>
  );
}


function TableCell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <td
      style={{
        padding:
          "var(--aix-space-sm)",
        borderBottom:
          "1px solid var(--aix-color-border)",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}


function formatScore(
  value: number,
): string {
  return value.toFixed(3);
}


function formatPercentage(
  value: number,
): string {
  return `${(
    value * 100
  ).toFixed(0)}%`;
}


function formatRawValue(
  value: number,
): string {
  return new Intl.NumberFormat().format(
    value,
  );
}


function formatWeightingMethod(
  method: string,
): string {
  if (method === "equal") {
    return "equal";
  }

  if (method === "custom") {
    return "custom";
  }

  return method;
}