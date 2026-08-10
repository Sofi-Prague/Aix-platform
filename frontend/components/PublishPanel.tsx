"use client";

import { useEffect, useState } from "react";

import {
  publishIndex,
  validateIndexForPublish,
  type IndexRecord,
  type PublishValidationResponse,
} from "../lib/api";

import { Button } from "./ui/Button";
import { StatusMessage } from "./ui/StatusMessage";

import { useRouter } from "next/navigation";

type PublishPanelProps = {
  selectedIndex: IndexRecord | null;
  methodologyVersion: number;
  onPublished: () => void;
};

export function PublishPanel({
  selectedIndex,
  methodologyVersion,
  onPublished,
}: PublishPanelProps) {
  const router = useRouter();

  const [validation, setValidation] =
    useState<PublishValidationResponse | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isPublishing, setIsPublishing] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!selectedIndex) {
      return;
    }

    const index = selectedIndex;
    let cancelled = false;

    async function validate(): Promise<void> {
      try {
        const result =
          await validateIndexForPublish(
            index.slug,
          );

        if (!cancelled) {
          setValidation(result);
          setError("");
        }
      } catch (caughtError) {
        if (!cancelled) {
          setValidation(null);

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to validate this index.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void validate();

    return () => {
      cancelled = true;
    };
  }, [selectedIndex, methodologyVersion]);

  async function loadValidation(): Promise<void> {
    if (!selectedIndex) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result =
        await validateIndexForPublish(
          selectedIndex.slug,
        );

      setValidation(result);
    } catch (caughtError) {
      setValidation(null);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to validate this index.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePublish(): Promise<void> {
    if (
      !selectedIndex ||
      !validation?.can_publish
    ) {
      return;
    }

    setIsPublishing(true);
    setError("");
    setSuccess("");

    try {
      const result = await publishIndex(
        selectedIndex.slug,
      );

      setSuccess(result.message);

      setValidation((current) =>
        current
          ? {
              ...current,
              current_status: "published",
            }
          : current,
      );

      onPublished();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to publish this index.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  if (!selectedIndex) {
    return (
      <StatusMessage
        type="empty"
        title="No index selected"
        message="Open an index to review its publishing checklist."
      />
    );
  }

  if (isLoading && !validation) {
    return (
      <p aria-live="polite">
        Checking publishing requirements…
      </p>
    );
  }

  return (
    <section aria-label="Publishing">
      <div
        style={{
          marginBottom: "var(--aix-space-lg)",
        }}
      >
        <h3
          style={{
            marginBottom: "4px",
          }}
        >
          Publish {selectedIndex.name}
        </h3>

        <p
          style={{
            marginTop: 0,
            color:
              "var(--aix-color-text-muted)",
          }}
        >
          Review the pre-publish checklist before
          making this index available.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom:
              "var(--aix-space-md)",
          }}
        >
          <StatusMessage
            type="error"
            title="Publishing error"
            message={error}
          />
        </div>
      )}

      {success && (
        <div
          style={{
            marginBottom:
              "var(--aix-space-md)",
          }}
          role="status"
        >
          <strong>{success}</strong>
        </div>
      )}

      {validation && (
        <>
          <div
            style={{
              display: "grid",
              gap: "var(--aix-space-sm)",
              marginBottom:
                "var(--aix-space-lg)",
            }}
          >
            {validation.checklist.map(
              (item) => (
                <article
                  key={item.key}
                  style={{
                    padding:
                      "var(--aix-space-md)",
                    border:
                      "1px solid var(--aix-color-border)",
                    borderRadius:
                      "var(--aix-radius-sm)",
                    background:
                      "var(--aix-color-surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap:
                        "var(--aix-space-sm)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      {item.passed ? "✓" : "✕"}
                    </span>

                    <div>
                      <strong>
                        {item.label}
                      </strong>

                      {item.detail && (
                        <p
                          style={{
                            marginBottom: 0,
                            color:
                              "var(--aix-color-text-muted)",
                            fontSize: "13px",
                          }}
                        >
                          {item.detail}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>

          {validation.current_status ===
          "published" ? (
            <StatusMessage
              type="empty"
              title="Already published"
              message="This index has already been published."
            />
          ) : validation.can_publish ? (
            <StatusMessage
              type="empty"
              title="Ready to publish"
              message="All current publishing requirements have been satisfied."
            />
          ) : (
            <StatusMessage
              type="empty"
              title="Not ready to publish"
              message="Complete the failed checklist items before publishing."
            />
          )}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--aix-space-sm)",
              marginTop:
                "var(--aix-space-lg)",
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void loadValidation()
              }
              disabled={
                isLoading ||
                isPublishing
              }
              isLoading={isLoading}
            >
              Recheck
            </Button>

            <Button
              type="button"
              onClick={() =>
                void handlePublish()
              }
              disabled={
                !validation.can_publish ||
                validation.current_status ===
                  "published" ||
                isLoading ||
                isPublishing
              }
              isLoading={isPublishing}
            >
              Publish index
            </Button>
            {validation.current_status === "published" && (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                router.push(
                  `/published/${encodeURIComponent(
                    selectedIndex.slug,
                  )}`,
                )
              }
            >
              View published index
            </Button>
          )}
          </div>
        </>
      )}
    </section>
  );
}