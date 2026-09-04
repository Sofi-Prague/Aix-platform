"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  createIndicator,
  deleteIndicator,
  getIndicators,
  type DimensionRecord,
  type IndicatorRecord,
  type IndexRecord,
  updateIndicator,
} from "../lib/api";

import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { StatusMessage } from "./ui/StatusMessage";

type IndicatorManagerProps = {
  selectedIndex: IndexRecord;
  selectedDimension: DimensionRecord;
  selectedIndicator: IndicatorRecord | null;
  methodologyVersion: number;

  onSelectIndicator: (
    indicator: IndicatorRecord | null,
  ) => void;

  onMethodologyChange: () => void;
};

type FormMode =
  | "closed"
  | "create"
  | "edit";

type Directionality =
  | "higher_is_better"
  | "lower_is_better"
  | "";

export function IndicatorManager({
  selectedIndex,
  selectedDimension,
  selectedIndicator,
  methodologyVersion,
  onSelectIndicator,
  onMethodologyChange,
}: IndicatorManagerProps) {
  const [
    indicators,
    setIndicators,
  ] = useState<IndicatorRecord[]>([]);

  const [mode, setMode] =
    useState<FormMode>("closed");

  const [
    editingIndicator,
    setEditingIndicator,
  ] =
    useState<IndicatorRecord | null>(
      null,
    );

  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [unit, setUnit] =
    useState("");

  const [
    directionality,
    setDirectionality,
  ] =
    useState<Directionality>("");

  const [
    indicatorStatus,
    setIndicatorStatus,
  ] = useState<"draft" | "ready">(
    "draft",
  );

  const [
    orderPosition,
    setOrderPosition,
  ] = useState(0);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(
    null,
  );

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadIndicators(): Promise<void> {
      setIsLoading(true);

      try {
        const result =
          await getIndicators(
            selectedIndex.slug,
            selectedDimension.id,
          );

        if (!cancelled) {
          setIndicators(result);
          setError("");
          setMessage("");
          setMode("closed");
          setEditingIndicator(null);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load indicators.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadIndicators();

    return () => {
      cancelled = true;
    };
  }, [
    selectedIndex.slug,
    selectedDimension.id,
    methodologyVersion,
  ]);

  useEffect(() => {
    if (
      mode === "create" ||
      mode === "edit"
    ) {
      const field =
        document.getElementById(
          "indicator-name",
        );

      field?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      field?.focus();
    }
  }, [mode]);

  function resetForm(): void {
    setMode("closed");
    setEditingIndicator(null);
    setName("");
    setDescription("");
    setUnit("");
    setDirectionality("");
    setIndicatorStatus("draft");
    setOrderPosition(0);
    setError("");
  }

  function beginCreate(): void {
    const nextPosition =
      indicators.length === 0
        ? 0
        : Math.max(
            ...indicators.map(
              (indicator) =>
                indicator.order_position,
            ),
          ) + 1;

    setEditingIndicator(null);
    setName("");
    setDescription("");
    setUnit("");
    setDirectionality("");
    setIndicatorStatus("draft");
    setOrderPosition(nextPosition);
    setError("");
    setMessage("");
    setMode("create");
  }

  function beginEdit(
    indicator: IndicatorRecord,
  ): void {
    setEditingIndicator(indicator);
    setName(indicator.name);

    setDescription(
      indicator.description ?? "",
    );

    setUnit(
      indicator.unit ?? "",
    );

    setDirectionality(
      indicator.directionality ?? "",
    );

    setIndicatorStatus(
      indicator.status,
    );

    setOrderPosition(
      indicator.order_position,
    );

    setError("");
    setMessage("");
    setMode("edit");

    onSelectIndicator(indicator);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      if (mode === "create") {
        const created =
          await createIndicator(
            selectedIndex.slug,
            selectedDimension.id,
            {
              name,
              description:
                description || null,
              unit: unit || null,
              directionality:
                directionality === ""
                  ? null
                  : directionality,
              status:
                indicatorStatus,
              order_position:
                orderPosition,
            },
          );

        setIndicators(
          (current) =>
            [
              ...current,
              created,
            ].sort(
              (
                first,
                second,
              ) =>
                first.order_position -
                second.order_position,
            ),
        );

        onSelectIndicator(created);
        onMethodologyChange();

        setMessage(
          `Created "${created.name}".`,
        );
      }

      if (
        mode === "edit" &&
        editingIndicator
      ) {
        const updated =
          await updateIndicator(
            selectedIndex.slug,
            selectedDimension.id,
            editingIndicator.id,
            {
              name,
              description:
                description || null,
              unit: unit || null,
              directionality:
                directionality === ""
                  ? null
                  : directionality,
              status:
                indicatorStatus,
              order_position:
                orderPosition,
            },
          );

        setIndicators(
          (current) =>
            current
              .map(
                (indicator) =>
                  indicator.id ===
                  updated.id
                    ? updated
                    : indicator,
              )
              .sort(
                (
                  first,
                  second,
                ) =>
                  first.order_position -
                  second.order_position,
              ),
        );

        onSelectIndicator(updated);
        onMethodologyChange();

        setMessage(
          `Updated "${updated.name}".`,
        );
      }

      resetForm();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the indicator.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(
    indicator: IndicatorRecord,
  ): Promise<void> {
    const confirmed =
      window.confirm(
        `Delete "${indicator.name}"? This action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(indicator.id);
    setError("");
    setMessage("");

    try {
      await deleteIndicator(
        selectedIndex.slug,
        selectedDimension.id,
        indicator.id,
      );

      setIndicators(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              indicator.id,
          ),
      );

      if (
        selectedIndicator?.id ===
        indicator.id
      ) {
        onSelectIndicator(null);
      }

      if (
        editingIndicator?.id ===
        indicator.id
      ) {
        resetForm();
      }

      onMethodologyChange();

      setMessage(
        `Deleted "${indicator.name}".`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the indicator.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section
      className="indicator-manager"
      aria-labelledby="indicator-manager-heading"
    >
      <div className="indicator-manager-header">
        <div>
          <h3 id="indicator-manager-heading">
            Indicators
          </h3>

          <span>
            {selectedDimension.name}
          </span>
        </div>

        <Button
          type="button"
          onClick={beginCreate}
        >
          + Indicator
        </Button>
      </div>

      {message && (
        <StatusMessage
          type="success"
          title={message}
        />
      )}

      {error && (
        <StatusMessage
          type="error"
          title="Indicator operation failed"
          message={error}
        />
      )}

      {mode !== "closed" && (
        <form
          className="indicator-editor"
          onSubmit={handleSubmit}
        >
          <div className="indicator-editor-heading">
            <h4>
              {mode === "create"
                ? "Add indicator"
                : "Edit indicator"}
            </h4>

            <Button
              type="button"
              variant="ghost"
              onClick={resetForm}
            >
              Close
            </Button>
          </div>

          <Input
            id="indicator-name"
            name="indicator-name"
            label="Name"
            required
            value={name}
            onChange={(event) =>
              setName(
                event.target.value,
              )
            }
          />

          <div className="aix-field">
            <label
              htmlFor="indicator-description"
              className="aix-label"
            >
              Description
            </label>

            <textarea
              id="indicator-description"
              className="aix-textarea"
              rows={3}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
            />
          </div>

          <Input
            id="indicator-unit"
            name="indicator-unit"
            label="Unit"
            value={unit}
            onChange={(event) =>
              setUnit(
                event.target.value,
              )
            }
          />

          <div className="aix-field">
            <label
              htmlFor="indicator-directionality"
              className="aix-label"
            >
              Directionality
            </label>

            <select
              id="indicator-directionality"
              className="aix-select"
              value={directionality}
              onChange={(event) =>
                setDirectionality(
                  event.target
                    .value as Directionality,
                )
              }
            >
              <option value="">
                Not specified
              </option>

              <option value="higher_is_better">
                Higher is better
              </option>

              <option value="lower_is_better">
                Lower is better
              </option>
            </select>
          </div>

          <div className="aix-field">
            <label
              htmlFor="indicator-status"
              className="aix-label"
            >
              Status
            </label>

            <select
              id="indicator-status"
              className="aix-select"
              value={indicatorStatus}
              onChange={(event) =>
                setIndicatorStatus(
                  event.target
                    .value as
                    | "draft"
                    | "ready",
                )
              }
            >
              <option value="draft">
                Draft
              </option>

              <option value="ready">
                Ready
              </option>
            </select>
          </div>

          <Input
            id="indicator-order"
            name="indicator-order"
            label="Order position"
            type="number"
            min={0}
            value={orderPosition}
            onChange={(event) =>
              setOrderPosition(
                Number(
                  event.target.value,
                ),
              )
            }
          />

          <div className="indicator-editor-actions">
            <Button
              type="submit"
              isLoading={isSaving}
            >
              {mode === "create"
                ? "Create indicator"
                : "Save changes"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={resetForm}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <StatusMessage
          type="loading"
          title="Loading indicators…"
        />
      ) : indicators.length === 0 ? (
        <StatusMessage
          type="empty"
          title="No indicators yet"
          message="Add the first indicator to this dimension."
        />
      ) : (
        <ul className="indicator-list">
          {indicators.map(
            (indicator) => {
              const isSelected =
                selectedIndicator
                  ?.id ===
                indicator.id;

              return (
                <li
                  key={
                    indicator.id
                  }
                  className="indicator-row"
                  data-selected={
                    isSelected
                  }
                >
                  <button
                    type="button"
                    className="indicator-row-main"
                    onClick={() =>
                      onSelectIndicator(
                        indicator,
                      )
                    }
                  >
                    <span className="indicator-row-title">
                      {indicator.name}
                    </span>

                    <span className="indicator-row-meta">
                      {indicator.status ===
                      "ready"
                        ? "Ready"
                        : "Draft"}

                      {indicator.unit
                        ? ` · ${indicator.unit}`
                        : ""}
                    </span>

                    {indicator.directionality && (
                      <span className="indicator-row-direction">
                        {formatDirectionality(
                          indicator.directionality,
                        )}
                      </span>
                    )}
                  </button>

                  <div className="indicator-row-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        beginEdit(
                          indicator,
                        )
                      }
                    >
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      disabled={
                        deletingId ===
                        indicator.id
                      }
                      onClick={() =>
                        void handleDelete(
                          indicator,
                        )
                      }
                    >
                      {deletingId ===
                      indicator.id
                        ? "Deleting…"
                        : "Delete"}
                    </Button>
                  </div>
                </li>
              );
            },
          )}
        </ul>
      )}
    </section>
  );
}

function formatDirectionality(
  directionality:
    | "higher_is_better"
    | "lower_is_better",
): string {
  return directionality ===
    "higher_is_better"
    ? "Higher is better"
    : "Lower is better";
}