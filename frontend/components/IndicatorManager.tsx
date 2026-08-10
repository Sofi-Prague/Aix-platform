"use client";

import { FormEvent, useEffect, useState } from "react";

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
};

type FormMode = "closed" | "create" | "edit";

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
}: IndicatorManagerProps) {
  const [indicators, setIndicators] = useState<
    IndicatorRecord[]
  >([]);

  const [mode, setMode] = useState<FormMode>("closed");

  const [editingIndicator, setEditingIndicator] =
    useState<IndicatorRecord | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [directionality, setDirectionality] =
    useState<Directionality>("");

  const [indicatorStatus, setIndicatorStatus] =
    useState<"draft" | "ready">("draft");

  const [orderPosition, setOrderPosition] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadIndicators(): Promise<void> {
      setIsLoading(true);
      setError("");
      setMessage("");
      setMode("closed");
      setEditingIndicator(null);

      try {
        const result = await getIndicators(
          selectedIndex.slug,
          selectedDimension.id,
        );

        setIndicators(result);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load indicators.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadIndicators(); 
    }, [
      selectedIndex.slug,
      selectedDimension.id,
      methodologyVersion,
    ]);

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
              (indicator) => indicator.order_position,
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
    setDescription(indicator.description ?? "");
    setUnit(indicator.unit ?? "");
    setDirectionality(
      indicator.directionality ?? "",
    );
    setIndicatorStatus(indicator.status);
    setOrderPosition(indicator.order_position);
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
        const created = await createIndicator(
          selectedIndex.slug,
          selectedDimension.id,
          {
            name,
            description: description || null,
            unit: unit || null,
            directionality:
              directionality === ""
                ? null
                : directionality,
            status: indicatorStatus,
            order_position: orderPosition,
          },
        );

        setIndicators((current) =>
          [...current, created].sort(
            (first, second) =>
              first.order_position -
              second.order_position,
          ),
        );

        onSelectIndicator(created);
        setMessage(`Created "${created.name}".`);
      }

      if (
        mode === "edit" &&
        editingIndicator
      ) {
        const updated = await updateIndicator(
          selectedIndex.slug,
          selectedDimension.id,
          editingIndicator.id,
          {
            name,
            description: description || null,
            unit: unit || null,
            directionality:
              directionality === ""
                ? null
                : directionality,
            status: indicatorStatus,
            order_position: orderPosition,
          },
        );

        setIndicators((current) =>
          current
            .map((indicator) =>
              indicator.id === updated.id
                ? updated
                : indicator,
            )
            .sort(
              (first, second) =>
                first.order_position -
                second.order_position,
            ),
        );

        onSelectIndicator(updated);
        setMessage(`Updated "${updated.name}".`);
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
    const confirmed = window.confirm(
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

      setIndicators((current) =>
        current.filter(
          (item) => item.id !== indicator.id,
        ),
      );

      if (selectedIndicator?.id === indicator.id) {
        onSelectIndicator(null);
      }

      if (editingIndicator?.id === indicator.id) {
        resetForm();
      }

      setMessage(`Deleted "${indicator.name}".`);
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
      aria-labelledby="indicator-manager-heading"
      style={{
        marginTop: "var(--aix-space-lg)",
        paddingTop: "var(--aix-space-md)",
        borderTop:
          "1px solid var(--aix-color-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "var(--aix-space-sm)",
          marginBottom: "var(--aix-space-md)",
        }}
      >
        <div>
          <h3
            id="indicator-manager-heading"
            style={{
              margin: 0,
              fontSize: "16px",
            }}
          >
            Indicators
          </h3>

          <p
            style={{
              margin: "4px 0 0",
              color: "var(--aix-color-text-muted)",
              fontSize: "13px",
            }}
          >
            {selectedDimension.name}
          </p>
        </div>

        <Button
          type="button"
          onClick={beginCreate}
        >
          Add indicator
        </Button>
      </div>

      {message && (
        <div
          style={{
            marginBottom: "var(--aix-space-md)",
          }}
        >
          <StatusMessage
            type="success"
            title={message}
          />
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: "var(--aix-space-md)",
          }}
        >
          <StatusMessage
            type="error"
            title="Indicator operation failed"
            message={error}
          />
        </div>
      )}

      {mode !== "closed" && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "var(--aix-space-md)",
            marginBottom: "var(--aix-space-lg)",
          }}
        >
          <h4 style={{ margin: 0 }}>
            {mode === "create"
              ? "Create indicator"
              : "Edit indicator"}
          </h4>

          <Input
            id="indicator-name"
            name="indicator-name"
            label="Name"
            required
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
          />

          <div
            style={{
              display: "grid",
              gap: "var(--aix-space-sm)",
            }}
          >
            <label htmlFor="indicator-description">
              Description
            </label>

            <textarea
              id="indicator-description"
              rows={4}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                border:
                  "1px solid var(--aix-color-border)",
                borderRadius:
                  "var(--aix-radius-sm)",
                font: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          <Input
            id="indicator-unit"
            name="indicator-unit"
            label="Unit"
            value={unit}
            onChange={(event) =>
              setUnit(event.target.value)
            }
          />

          <div
            style={{
              display: "grid",
              gap: "var(--aix-space-sm)",
            }}
          >
            <label htmlFor="indicator-directionality">
              Directionality
            </label>

            <select
              id="indicator-directionality"
              value={directionality}
              onChange={(event) =>
                setDirectionality(
                  event.target.value as Directionality,
                )
              }
              style={{
                minHeight: "42px",
                padding: "10px 12px",
                border:
                  "1px solid var(--aix-color-border)",
                borderRadius:
                  "var(--aix-radius-sm)",
                background:
                  "var(--aix-color-surface)",
                color: "var(--aix-color-text)",
                font: "inherit",
              }}
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

          <div
            style={{
              display: "grid",
              gap: "var(--aix-space-sm)",
            }}
          >
            <label htmlFor="indicator-status">
              Status
            </label>

            <select
              id="indicator-status"
              value={indicatorStatus}
              onChange={(event) =>
                setIndicatorStatus(
                  event.target.value as
                    | "draft"
                    | "ready",
                )
              }
              style={{
                minHeight: "42px",
                padding: "10px 12px",
                border:
                  "1px solid var(--aix-color-border)",
                borderRadius:
                  "var(--aix-radius-sm)",
                background:
                  "var(--aix-color-surface)",
                color: "var(--aix-color-text)",
                font: "inherit",
              }}
            >
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
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
                Number(event.target.value),
              )
            }
          />

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--aix-space-sm)",
            }}
          >
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
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: "var(--aix-space-sm)",
          }}
        >
          {indicators.map((indicator) => {
            const isSelected =
              selectedIndicator?.id === indicator.id;

            return (
              <li
                key={indicator.id}
                style={{
                  padding: "var(--aix-space-sm)",
                  border: isSelected
                    ? "2px solid var(--aix-color-primary)"
                    : "1px solid var(--aix-color-border)",
                  borderRadius:
                    "var(--aix-radius-sm)",
                  background:
                    "var(--aix-color-surface)",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    onSelectIndicator(indicator)
                  }
                  style={{
                    width: "100%",
                    border: 0,
                    padding: 0,
                    textAlign: "left",
                    background: "transparent",
                    cursor: "pointer",
                    color: "inherit",
                  }}
                >
                  <strong>{indicator.name}</strong>

                  <p
                    style={{
                      margin: "4px 0",
                      color:
                        "var(--aix-color-text-muted)",
                      fontSize: "13px",
                    }}
                  >
                    {indicator.status}
                    {indicator.unit
                      ? ` · ${indicator.unit}`
                      : ""}
                  </p>

                  {indicator.directionality && (
                    <p
                      style={{
                        margin: 0,
                        color:
                          "var(--aix-color-text-muted)",
                        fontSize: "13px",
                      }}
                    >
                      {indicator.directionality ===
                      "higher_is_better"
                        ? "Higher is better"
                        : "Lower is better"}
                    </p>
                  )}
                </button>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--aix-space-sm)",
                    marginTop: "var(--aix-space-sm)",
                  }}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      beginEdit(indicator)
                    }
                  >
                    Edit
                  </Button>

                  <Button
                    type="button"
                    variant="danger"
                    disabled={
                      deletingId === indicator.id
                    }
                    onClick={() =>
                      void handleDelete(indicator)
                    }
                  >
                    {deletingId === indicator.id
                      ? "Deleting…"
                      : "Delete"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}