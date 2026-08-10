"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  createDimension,
  deleteDimension,
  getDimensions,
  type DimensionRecord,
  type IndicatorRecord,
  type IndexRecord,
  updateDimension,
} from "../lib/api";

import { IndicatorManager } from "./IndicatorManager";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { StatusMessage } from "./ui/StatusMessage";

type DimensionManagerProps = {
  selectedIndex: IndexRecord | null;
  selectedDimension: DimensionRecord | null;
  selectedIndicator: IndicatorRecord | null;
  methodologyVersion: number;

  onSelectDimension: (
    dimension: DimensionRecord | null,
  ) => void;

  onSelectIndicator: (
    indicator: IndicatorRecord | null,
  ) => void;

  onMethodologyChange: () => void;
};

type FormMode = "closed" | "create" | "edit";

export function DimensionManager({
  selectedIndex,
  selectedDimension,
  selectedIndicator,
  methodologyVersion,
  onSelectDimension,
  onSelectIndicator,
  onMethodologyChange,
}: DimensionManagerProps) {
  const [dimensions, setDimensions] = useState<
    DimensionRecord[]
  >([]);

  const [mode, setMode] =
    useState<FormMode>("closed");

  const [editingDimension, setEditingDimension] =
    useState<DimensionRecord | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [orderPosition, setOrderPosition] =
    useState(0);

  const [isLoading, setIsLoading] =
    useState(false);
  const [isSaving, setIsSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDimensions(): Promise<void> {
      if (!selectedIndex) {
        setDimensions([]);
        setMode("closed");
        setEditingDimension(null);
        return;
      }

      setIsLoading(true);
      setError("");
      setMessage("");
      setMode("closed");
      setEditingDimension(null);

      try {
        const result = await getDimensions(
          selectedIndex.slug,
        );

        setDimensions(result);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load dimensions.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDimensions();
  }, [selectedIndex, methodologyVersion]);

  function resetForm(): void {
    setMode("closed");
    setEditingDimension(null);
    setName("");
    setDescription("");
    setOrderPosition(0);
    setError("");
  }

  function beginCreate(): void {
    const nextPosition =
      dimensions.length === 0
        ? 0
        : Math.max(
            ...dimensions.map(
              (dimension) =>
                dimension.order_position,
            ),
          ) + 1;

    setEditingDimension(null);
    setName("");
    setDescription("");
    setOrderPosition(nextPosition);
    setError("");
    setMessage("");
    setMode("create");
  }

  function beginEdit(
    dimension: DimensionRecord,
  ): void {
    setEditingDimension(dimension);
    setName(dimension.name);
    setDescription(
      dimension.description ?? "",
    );
    setOrderPosition(
      dimension.order_position,
    );
    setError("");
    setMessage("");
    setMode("edit");

    onSelectDimension(dimension);
    onSelectIndicator(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!selectedIndex) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      if (mode === "create") {
        const created =
          await createDimension(
            selectedIndex.slug,
            {
              name,
              description:
                description || null,
              order_position:
                orderPosition,
            },
          );

        setDimensions((current) =>
          [...current, created].sort(
            (first, second) =>
              first.order_position -
              second.order_position,
          ),
        );

        onSelectDimension(created);
        onSelectIndicator(null);

        onMethodologyChange();

        setMessage(
          `Created "${created.name}".`,
        );
      }

      if (
        mode === "edit" &&
        editingDimension
      ) {
        const updated =
          await updateDimension(
            selectedIndex.slug,
            editingDimension.id,
            {
              name,
              description:
                description || null,
              order_position:
                orderPosition,
            },
          );

        setDimensions((current) =>
          current
            .map((dimension) =>
              dimension.id ===
              updated.id
                ? updated
                : dimension,
            )
            .sort(
              (first, second) =>
                first.order_position -
                second.order_position,
            ),
        );

        onSelectDimension(updated);
        onSelectIndicator(null);

        onMethodologyChange();

        setMessage(
          `Updated "${updated.name}".`,
        );
      }

      setMode("closed");
      setEditingDimension(null);
      setName("");
      setDescription("");
      setOrderPosition(0);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the dimension.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(
    dimension: DimensionRecord,
  ): Promise<void> {
    if (!selectedIndex) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${dimension.name}"? Any indicators inside it will also be removed.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(dimension.id);
    setError("");
    setMessage("");

    try {
      await deleteDimension(
        selectedIndex.slug,
        dimension.id,
      );

      setDimensions((current) =>
        current.filter(
          (item) =>
            item.id !== dimension.id,
        ),
      );

      if (
        selectedDimension?.id ===
        dimension.id
      ) {
        onSelectDimension(null);
        onSelectIndicator(null);
      }

      if (
        editingDimension?.id ===
        dimension.id
      ) {
        resetForm();
      }

      onMethodologyChange();

      setMessage(
        `Deleted "${dimension.name}".`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the dimension.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (!selectedIndex) {
    return (
      <StatusMessage
        type="empty"
        title="No index selected"
        message="Open an index before managing its dimensions."
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "var(--aix-space-sm)",
          marginBottom:
            "var(--aix-space-md)",
        }}
      >
        <div>
          <strong>
            {selectedIndex.name}
          </strong>

          <p
            style={{
              margin: "4px 0 0",
              color:
                "var(--aix-color-text-muted)",
              fontSize: "13px",
            }}
          >
            Dimensions
          </p>
        </div>

        <Button
          type="button"
          onClick={beginCreate}
        >
          Add dimension
        </Button>
      </div>

      {message && (
        <div
          style={{
            marginBottom:
              "var(--aix-space-md)",
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
            marginBottom:
              "var(--aix-space-md)",
          }}
        >
          <StatusMessage
            type="error"
            title="Dimension operation failed"
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
            marginBlock:
              "var(--aix-space-md)",
          }}
        >
          <h3 style={{ margin: 0 }}>
            {mode === "create"
              ? "Add dimension"
              : "Edit dimension"}
          </h3>

          <Input
            id="dimension-name"
            name="dimension-name"
            label="Name"
            required
            value={name}
            onChange={(event) =>
              setName(
                event.target.value,
              )
            }
          />

          <div
            style={{
              display: "grid",
              gap:
                "var(--aix-space-sm)",
            }}
          >
            <label htmlFor="dimension-description">
              Description
            </label>

            <textarea
              id="dimension-description"
              rows={4}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
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
            id="dimension-position"
            name="dimension-position"
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

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap:
                "var(--aix-space-sm)",
            }}
          >
            <Button
              type="submit"
              isLoading={isSaving}
            >
              {mode === "create"
                ? "Create dimension"
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
          title="Loading dimensions…"
        />
      ) : dimensions.length === 0 ? (
        <StatusMessage
          type="empty"
          title="No dimensions yet"
          message="Add the first dimension to begin building the methodology."
        />
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap:
              "var(--aix-space-sm)",
          }}
        >
          {dimensions.map(
            (dimension) => {
              const isSelected =
                selectedDimension?.id ===
                dimension.id;

              return (
                <li
                  key={dimension.id}
                  style={{
                    padding:
                      "var(--aix-space-sm)",
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
                    onClick={() => {
                      onSelectDimension(
                        dimension,
                      );
                      onSelectIndicator(
                        null,
                      );
                    }}
                    style={{
                      width: "100%",
                      border: 0,
                      padding: 0,
                      textAlign: "left",
                      background:
                        "transparent",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                  >
                    <strong>
                      {dimension.name}
                    </strong>

                    <p
                      style={{
                        margin:
                          "4px 0",
                        color:
                          "var(--aix-color-text-muted)",
                      }}
                    >
                      Position{" "}
                      {
                        dimension.order_position
                      }
                    </p>

                    {dimension.description && (
                      <p
                        style={{
                          margin:
                            "4px 0 0",
                          color:
                            "var(--aix-color-text-muted)",
                          fontSize:
                            "13px",
                        }}
                      >
                        {
                          dimension.description
                        }
                      </p>
                    )}
                  </button>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap:
                        "var(--aix-space-sm)",
                      marginTop:
                        "var(--aix-space-sm)",
                    }}
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        beginEdit(
                          dimension,
                        )
                      }
                    >
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      disabled={
                        deletingId ===
                        dimension.id
                      }
                      onClick={() =>
                        void handleDelete(
                          dimension,
                        )
                      }
                    >
                      {deletingId ===
                      dimension.id
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

      {selectedDimension && (
        <IndicatorManager
          selectedIndex={selectedIndex}
          selectedDimension={
            selectedDimension
          }
          selectedIndicator={
            selectedIndicator
          }
          methodologyVersion={
            methodologyVersion
          }
          onSelectIndicator={
            onSelectIndicator
          }
          onMethodologyChange={
            onMethodologyChange
          }
        />
      )}
    </div>
  );
}