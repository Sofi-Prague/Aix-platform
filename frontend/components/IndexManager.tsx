"use client";

import { FormEvent, useState } from "react";

import {
  createIndex,
  deleteIndex,
  type IndexRecord,
  updateIndex,
} from "../lib/api";

import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { StatusMessage } from "./ui/StatusMessage";

type IndexManagerProps = {
  indexes: IndexRecord[];
  selectedIndex: IndexRecord | null;

  onIndexesChange: (
    indexes: IndexRecord[],
  ) => void;

  onSelectIndex: (
    index: IndexRecord | null,
  ) => void;

  onMethodologyChange: () => void;
};

type EditorMode = "closed" | "create" | "edit";
type EditableIndexStatus = "draft" | "archived";

function makeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function IndexManager({
  indexes,
  selectedIndex,
  onIndexesChange,
  onSelectIndex,
  onMethodologyChange,
}: IndexManagerProps) {
  const [mode, setMode] =
    useState<EditorMode>("closed");

  const [
    isIndexListOpen,
    setIsIndexListOpen,
  ] = useState(false);

  const [editingIndex, setEditingIndex] =
    useState<IndexRecord | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] =
    useState("");

  const [status, setStatus] =
    useState<EditableIndexStatus>("draft");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [deletingSlug, setDeletingSlug] =
    useState<string | null>(null);

  function resetForm(): void {
    setMode("closed");
    setEditingIndex(null);
    setName("");
    setSlug("");
    setDescription("");
    setStatus("draft");
    setError("");
  }

  function beginCreate(): void {
    resetForm();
    setMessage("");
    setMode("create");
  }

  function beginEdit(
    index: IndexRecord,
  ): void {
    setEditingIndex(index);
    setName(index.name);
    setSlug(index.slug);
    setDescription(
      index.description ?? "",
    );
    setStatus(
      index.status === "archived"
        ? "archived"
        : "draft",
    );
    setError("");
    setMessage("");
    setMode("edit");
  }

  function handleNameChange(
    value: string,
  ): void {
    setName(value);

    if (mode === "create") {
      setSlug(makeSlug(value));
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      if (mode === "create") {
        const created = await createIndex({
          name,
          slug,
          description:
            description || null,
        });

        onIndexesChange([
          created,
          ...indexes,
        ]);

        onSelectIndex(created);
        setIsIndexListOpen(false);

        onMethodologyChange();

        setMessage(
          `Created "${created.name}".`,
        );
      }

      if (
        mode === "edit" &&
        editingIndex
      ) {
        const updated =
          await updateIndex(
            editingIndex.slug,
            {
              name,
              slug,
              description:
                description || null,
              status,
            },
          );

        onIndexesChange(
          indexes.map((index) =>
            index.id === updated.id
              ? updated
              : index,
          ),
        );

        if (
          selectedIndex?.id ===
          updated.id
        ) {
          onSelectIndex(updated);
        }

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
          : "Unable to save the index.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(
    index: IndexRecord,
  ): Promise<void> {
    const confirmed = window.confirm(
      `Delete "${index.name}"? This action cannot currently be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setDeletingSlug(index.slug);

    try {
      await deleteIndex(index.slug);

      onIndexesChange(
        indexes.filter(
          (item) =>
            item.id !== index.id,
        ),
      );

      if (
        selectedIndex?.id === index.id
      ) {
        onSelectIndex(null);
        setIsIndexListOpen(true);
      }

      if (
        editingIndex?.id === index.id
      ) {
        resetForm();
      }

      onMethodologyChange();

      setMessage(
        `Deleted "${index.name}".`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the index.",
      );
    } finally {
      setDeletingSlug(null);
    }
  }

  return (
    <section
      aria-labelledby="index-manager-heading"
      style={{
        padding:
          "var(--aix-space-lg)",
        borderBottom:
          "1px solid var(--aix-color-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap:
            "var(--aix-space-md)",
          marginBottom:
            "var(--aix-space-md)",
        }}
      >
        <h1
          id="index-manager-heading"
          style={{
            margin: 0,
            fontSize: "20px",
          }}
        >
          Your indexes
        </h1>

        <Button
          type="button"
          onClick={() => {
            setIsIndexListOpen(true);
            beginCreate();
          }}
        >
          New index
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
            title="Index operation failed"
            message={error}
          />
        </div>
      )}

      {mode !== "closed" && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap:
              "var(--aix-space-md)",
            maxWidth: "620px",
            marginBlock:
              "var(--aix-space-lg)",
          }}
        >
          <h2
            style={{
              margin: 0,
            }}
          >
            {mode === "create"
              ? "Create index"
              : "Edit index"}
          </h2>

          <Input
            id="index-name"
            name="index-name"
            label="Name"
            required
            value={name}
            onChange={(event) =>
              handleNameChange(
                event.target.value,
              )
            }
          />

          <Input
            id="index-slug"
            name="index-slug"
            label="Slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            value={slug}
            onChange={(event) =>
              setSlug(
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
            <label htmlFor="index-description">
              Description
            </label>

            <textarea
              id="index-description"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              rows={4}
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

          {mode === "edit" && (
            <div
              style={{
                display: "grid",
                gap:
                  "var(--aix-space-sm)",
              }}
            >
              <label htmlFor="index-status">
                Status
              </label>

              <select
                id="index-status"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as EditableIndexStatus,
                  )
                }
                style={{
                  minHeight: "42px",
                  padding:
                    "10px 12px",
                  border:
                    "1px solid var(--aix-color-border)",
                  borderRadius:
                    "var(--aix-radius-sm)",
                  background:
                    "var(--aix-color-surface)",
                  color:
                    "var(--aix-color-text)",
                  font: "inherit",
                }}
              >
                <option value="draft">
                  Draft
                </option>

                <option value="archived">
                  Archived
                </option>
              </select>

              {editingIndex?.status === "published" && (
                <p
                  style={{
                    margin: 0,
                    color: "var(--aix-color-text-muted)",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  Published status can only be reached through the
                  Publish checklist. Saving changes to a published
                  index returns it to Draft for recalculation,
                  validation, and republication.
                </p>
              )}
            </div>
          )}

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
                ? "Create index"
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

      {selectedIndex && !isIndexListOpen ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--aix-space-md)",
            padding: "var(--aix-space-md)",
            border:
              "1px solid var(--aix-color-border)",
            borderRadius:
              "var(--aix-radius-sm)",
            background:
              "var(--aix-color-surface)",
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
              }}
            >
              {selectedIndex.slug} ·{" "}
              {selectedIndex.status}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "var(--aix-space-sm)",
              flexWrap: "wrap",
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setIsIndexListOpen(true)
              }
            >
              Change index
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                beginEdit(selectedIndex)
              }
            >
              Edit
            </Button>
          </div>
        </div>
      ) : indexes.length === 0 ? (
        <StatusMessage
          type="empty"
          title="No indexes yet"
          message="Create the first index for this tenant."
        />
      ) : (
        <ul
          style={{
            display: "grid",
            gap: "var(--aix-space-sm)",
            padding: 0,
            margin: 0,
            listStyle: "none",
          }}
        >
          {indexes.map((index) => {
            const isSelected =
              selectedIndex?.id === index.id;

            return (
              <li
                key={index.id}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap:
                    "var(--aix-space-md)",
                  padding:
                    "var(--aix-space-md)",
                  border: isSelected
                    ? "2px solid var(--aix-color-primary)"
                    : "1px solid var(--aix-color-border)",
                  borderRadius:
                    "var(--aix-radius-sm)",
                  background:
                    "var(--aix-color-surface)",
                }}
              >
                <div>
                  <strong>
                    {index.name}
                  </strong>

                  <p
                    style={{
                      margin: "4px 0 0",
                      color:
                        "var(--aix-color-text-muted)",
                    }}
                  >
                    {index.slug} ·{" "}
                    {index.status}
                  </p>

                  {index.description && (
                    <p
                      style={{
                        margin:
                          "var(--aix-space-sm) 0 0",
                        color:
                          "var(--aix-color-text-muted)",
                        maxWidth: "600px",
                      }}
                    >
                      {index.description}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap:
                      "var(--aix-space-sm)",
                  }}
                >
                  <Button
                    type="button"
                    variant={
                      isSelected
                        ? "primary"
                        : "secondary"
                    }
                    onClick={() => {
                      onSelectIndex(index);
                      setIsIndexListOpen(
                        false,
                      );
                    }}
                  >
                    {isSelected
                      ? "Use selected"
                      : "Open"}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      beginEdit(index)
                    }
                  >
                    Edit
                  </Button>

                  <Button
                    type="button"
                    variant="danger"
                    disabled={
                      deletingSlug ===
                      index.slug
                    }
                    onClick={() =>
                      void handleDelete(index)
                    }
                  >
                    {deletingSlug ===
                    index.slug
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