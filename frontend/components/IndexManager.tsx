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

type EditorMode =
  | "closed"
  | "create"
  | "edit";

type EditableIndexStatus =
  | "draft"
  | "archived";

function makeSlug(
  value: string,
): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

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

function getStatusLabel(
  status: string,
): string {
  switch (status) {
    case "published":
      return "Published";

    case "archived":
      return "Archived";

    default:
      return "Draft";
  }
}

function getStatusType(
  status: string,
):
  | "success"
  | "warning"
  | "danger"
  | "info" {
  switch (status) {
    case "published":
      return "success";

    case "archived":
      return "danger";

    default:
      return "warning";
  }
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
    editingIndex,
    setEditingIndex,
  ] =
    useState<IndexRecord | null>(
      null,
    );

  const [name, setName] =
    useState("");

  const [slug, setSlug] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [status, setStatus] =
    useState<EditableIndexStatus>(
      "draft",
    );

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    deletingSlug,
    setDeletingSlug,
  ] = useState<string | null>(null);

  const publishedCount =
    indexes.filter(
      (index) =>
        index.status === "published",
    ).length;

  const draftCount =
    indexes.filter(
      (index) =>
        index.status === "draft",
    ).length;

  const archivedCount =
    indexes.filter(
      (index) =>
        index.status === "archived",
    ).length;

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

    focusEditor("index-name");
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

    focusEditor("index-name");
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
        const created =
          await createIndex({
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
    const confirmed =
      window.confirm(
        `Delete "${index.name}"? This action cannot currently be undone.`,
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setDeletingSlug(index.slug);

    try {
      await deleteIndex(
        index.slug,
      );

      onIndexesChange(
        indexes.filter(
          (item) =>
            item.id !== index.id,
        ),
      );

      if (
        selectedIndex?.id ===
        index.id
      ) {
        onSelectIndex(null);
      }

      if (
        editingIndex?.id ===
        index.id
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
      id="indexes"
      className="index-dashboard"
      aria-labelledby="indexes-heading"
    >
      <div className="index-dashboard-stats">
        <article className="index-stat-card">
          <span className="index-stat-value">
            {indexes.length}
          </span>

          <span className="index-stat-label">
            Total indexes
          </span>

          <span className="index-stat-detail">
            Research projects in your
            workspace
          </span>
        </article>

        <article className="index-stat-card">
          <span className="index-stat-value">
            {publishedCount}
          </span>

          <span className="index-stat-label">
            Published
          </span>

          <span className="index-stat-detail">
            Available through public
            results
          </span>
        </article>

        <article className="index-stat-card">
          <span className="index-stat-value">
            {draftCount}
          </span>

          <span className="index-stat-label">
            Draft
          </span>

          <span className="index-stat-detail">
            Currently in development
          </span>
        </article>

        {archivedCount > 0 && (
          <article className="index-stat-card">
            <span className="index-stat-value">
              {archivedCount}
            </span>

            <span className="index-stat-label">
              Archived
            </span>

            <span className="index-stat-detail">
              Retained historical
              projects
            </span>
          </article>
        )}
      </div>

      <div className="index-dashboard-heading">
        <div>
          <p className="aix-section-label">
            Research portfolio
          </p>

          <h2
            id="indexes-heading"
            className="index-dashboard-title"
          >
            My Indexes
          </h2>

          <p className="index-dashboard-description">
            Create, manage and open
            your research indices.
          </p>
        </div>

        <Button
          type="button"
          onClick={beginCreate}
        >
          + New index
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
          title="Index operation failed"
          message={error}
        />
      )}

      {mode !== "closed" && (
        <form
          className="index-editor"
          onSubmit={handleSubmit}
        >
          <div className="index-editor-header">
            <div>
              <p className="aix-section-label">
                {mode === "create"
                  ? "New research project"
                  : "Index settings"}
              </p>

              <h3>
                {mode === "create"
                  ? "Create index"
                  : `Edit ${editingIndex?.name ?? "index"}`}
              </h3>
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={resetForm}
              aria-label="Close index editor"
            >
              Close
            </Button>
          </div>

          <div className="index-editor-grid">
            <Input
              id="index-name"
              name="index-name"
              label="Index name"
              hint="Use the full research or publication title."
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
              label="URL slug"
              hint="Used in the public index URL."
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={slug}
              onChange={(event) =>
                setSlug(
                  event.target.value,
                )
              }
            />

            <div className="aix-field index-editor-description">
              <label
                htmlFor="index-description"
                className="aix-label"
              >
                Description
              </label>

              <textarea
                id="index-description"
                className="aix-textarea"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="Describe the purpose and scope of this index."
              />

              <p className="aix-field-hint">
                Briefly explain what the
                index measures and why it
                matters.
              </p>
            </div>

            {mode === "edit" && (
              <div className="aix-field">
                <label
                  htmlFor="index-status"
                  className="aix-label"
                >
                  Status
                </label>

                <select
                  id="index-status"
                  className="aix-select"
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target
                        .value as EditableIndexStatus,
                    )
                  }
                >
                  <option value="draft">
                    Draft
                  </option>

                  <option value="archived">
                    Archived
                  </option>
                </select>

                {editingIndex?.status ===
                  "published" && (
                  <p className="aix-field-hint">
                    Published status is
                    reached through the
                    Publish checklist.
                    Saving methodology
                    changes returns the
                    index to Draft for
                    recalculation,
                    validation and
                    republication.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="index-editor-actions">
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

      {indexes.length === 0 ? (
        <div className="index-empty-state">
          <div
            className="index-empty-icon"
            aria-hidden="true"
          >
            +
          </div>

          <h3>
            Create your first index
          </h3>

          <p>
            Start a research project by
            defining an index, its
            dimensions and indicators.
          </p>

          <Button
            type="button"
            onClick={beginCreate}
          >
            Create new index
          </Button>
        </div>
      ) : (
        <div className="index-card-grid">
          {indexes.map((index) => {
            const isSelected =
              selectedIndex?.id ===
              index.id;

            return (
              <article
                key={index.id}
                className="index-project-card"
                data-selected={
                  isSelected
                }
              >
                <div className="index-project-card-header">
                  <div>
                    <span
                      className="aix-badge"
                      data-status={getStatusType(
                        index.status,
                      )}
                    >
                      {getStatusLabel(
                        index.status,
                      )}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="index-selected-label">
                      Current
                    </span>
                  )}
                </div>

                <div className="index-project-card-body">
                  <h3>
                    {index.name}
                  </h3>

                  <p className="index-project-description">
                    {index.description ||
                      "No description has been added to this index yet."}
                  </p>
                </div>

                <div className="index-project-meta">
                  <span>
                    Identifier
                  </span>

                  <code>
                    {index.slug}
                  </code>
                </div>

                <div className="index-project-actions">
                  <div className="index-project-secondary-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        beginEdit(index)
                      }
                    >
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      disabled={
                        deletingSlug ===
                        index.slug
                      }
                      onClick={() =>
                        void handleDelete(
                          index,
                        )
                      }
                    >
                      {deletingSlug ===
                      index.slug
                        ? "Deleting…"
                        : "Delete"}
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant={
                      isSelected
                        ? "secondary"
                        : "primary"
                    }
                    onClick={() =>
                      onSelectIndex(index)
                    }
                  >
                    {isSelected
                      ? "Open workspace"
                      : "Open index →"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}