"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

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
  selectedDimension:
    | DimensionRecord
    | null;
  selectedIndicator:
    | IndicatorRecord
    | null;

  methodologyVersion: number;

  onSelectDimension: (
    dimension:
      | DimensionRecord
      | null,
  ) => void;

  onSelectIndicator: (
    indicator:
      | IndicatorRecord
      | null,
  ) => void;

  onMethodologyChange: () => void;
};

type FormMode =
  | "closed"
  | "create"
  | "edit";

function focusEditor(
  fieldId: string,
): void {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const field =
        document.getElementById(
          fieldId,
        );

      field?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      field?.focus();
    });
  });
}

export function DimensionManager({
  selectedIndex,
  selectedDimension,
  selectedIndicator,
  methodologyVersion,
  onSelectDimension,
  onSelectIndicator,
  onMethodologyChange,
}: DimensionManagerProps) {
  const [
    dimensions,
    setDimensions,
  ] = useState<DimensionRecord[]>(
    [],
  );

  const [mode, setMode] =
    useState<FormMode>("closed");

  const [
    editingDimension,
    setEditingDimension,
  ] =
    useState<DimensionRecord | null>(
      null,
    );

  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

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
  ] = useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

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
        const result =
          await getDimensions(
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
  }, [
    selectedIndex,
    methodologyVersion,
  ]);

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

    focusEditor("dimension-name");
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

    focusEditor("dimension-name");
  }

  function toggleDimension(
    dimension: DimensionRecord,
  ): void {
    const isOpen =
      selectedDimension?.id ===
      dimension.id;

    if (isOpen) {
      onSelectIndicator(null);
      onSelectDimension(null);
      return;
    }

    onSelectIndicator(null);
    onSelectDimension(dimension);
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

        setDimensions(
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

        setDimensions(
          (current) =>
            current
              .map(
                (dimension) =>
                  dimension.id ===
                  updated.id
                    ? updated
                    : dimension,
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

    const confirmed =
      window.confirm(
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

      setDimensions(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              dimension.id,
          ),
      );

      if (
        selectedDimension?.id ===
        dimension.id
      ) {
        onSelectIndicator(null);
        onSelectDimension(null);
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
    <div className="dimension-manager">
      <div className="dimension-manager-header">
        <div>
          <strong>
            {selectedIndex.name}
          </strong>

          <p>
            Index structure
          </p>
        </div>

        <Button
          type="button"
          onClick={beginCreate}
        >
          + Dimension
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
          title="Dimension operation failed"
          message={error}
        />
      )}

      {mode !== "closed" && (
        <form
          className="dimension-editor"
          onSubmit={handleSubmit}
        >
          <div className="dimension-editor-heading">
            <div>
              <p className="aix-section-label">
                {mode === "create"
                  ? "Index structure"
                  : "Dimension settings"}
              </p>

              <h3>
                {mode === "create"
                  ? "Add dimension"
                  : "Edit dimension"}
              </h3>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={resetForm}
            >
              Close
            </Button>
          </div>

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

          <div className="aix-field">
            <label
              htmlFor="dimension-description"
              className="aix-label"
            >
              Description
            </label>

            <textarea
              id="dimension-description"
              className="aix-textarea"
              rows={4}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder="Describe what this dimension measures."
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

          <div className="dimension-editor-actions">
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
        <ul className="dimension-list">
          {dimensions.map(
            (dimension) => {
              const isExpanded =
                selectedDimension
                  ?.id ===
                dimension.id;

              return (
                <li
                  key={
                    dimension.id
                  }
                  className="dimension-accordion"
                  data-expanded={
                    isExpanded
                  }
                >
                  <button
                    type="button"
                    className="dimension-accordion-trigger"
                    aria-expanded={
                      isExpanded
                    }
                    onClick={() =>
                      toggleDimension(
                        dimension,
                      )
                    }
                  >
                    <span className="dimension-accordion-chevron">
                      {isExpanded
                        ? "⌄"
                        : "›"}
                    </span>

                    <span className="dimension-accordion-title">
                      <strong>
                        {
                          dimension.name
                        }
                      </strong>

                      <span>
                        Position{" "}
                        {
                          dimension.order_position
                        }
                      </span>
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="dimension-accordion-content">
                      {dimension.description && (
                        <p className="dimension-description">
                          {
                            dimension.description
                          }
                        </p>
                      )}

                      <div className="dimension-actions">
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

                      <div className="dimension-indicators">
                        <IndicatorManager
                          selectedIndex={
                            selectedIndex
                          }
                          selectedDimension={
                            dimension
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
                      </div>
                    </div>
                  )}
                </li>
              );
            },
          )}
        </ul>
      )}
    </div>
  );
}