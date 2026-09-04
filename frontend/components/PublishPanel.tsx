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
  mode?: "validate" | "publish";
};

export function PublishPanel({
  selectedIndex,
  methodologyVersion,
  onPublished,
  mode = "publish",
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

  const passedChecks =
    validation?.checklist.filter(
      (item) => item.passed,
    ).length ?? 0;

  const totalChecks =
    validation?.checklist.length ?? 0;

  return (
    <section
      aria-label={
        mode === "validate"
          ? "Publication validation"
          : "Publishing"
      }
      className="publication-panel"
      data-mode={mode}
    >
      <header className="publication-panel-header">
        <h3>
          {mode === "validate"
            ? "Publication validation"
            : `Publish ${selectedIndex.name}`}
        </h3>

        <p>
          {mode === "validate"
            ? "Review the publishing requirements and resolve any failed checks before publication."
            : "Review readiness and publish this index when all requirements are satisfied."}
        </p>
      </header>

      {error && (
        <StatusMessage
          type="error"
          title={
            mode === "validate"
              ? "Validation error"
              : "Publishing error"
          }
          message={error}
        />
      )}

      {success && (
        <StatusMessage
          type="success"
          title={success}
        />
      )}

      {validation && mode === "validate" && (
        <>
          <div className="publication-summary-row">
            <span className="aix-badge" data-status={
              validation.can_publish
                ? "success"
                : "warning"
            }>
              {passedChecks} of {totalChecks} checks passed
            </span>

            <span className="publication-status-copy">
              {validation.can_publish
                ? "Ready for publication"
                : "Action required"}
            </span>
          </div>

          <div className="publication-checklist">
            {validation.checklist.map(
              (item) => (
                <article
                  key={item.key}
                  className="publication-check"
                  data-passed={item.passed}
                >
                  <span
                    className="publication-check-icon"
                    aria-hidden="true"
                  >
                    {item.passed ? "✓" : "✕"}
                  </span>

                  <div>
                    <strong>
                      {item.label}
                    </strong>

                    {item.detail && (
                      <p>
                        {item.detail}
                      </p>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>

          <div className="publication-panel-actions">
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
              Recheck validation
            </Button>
          </div>
        </>
      )}

      {validation && mode === "publish" && (
        <>
          <div className="publication-readiness-card">
            <div>
              <span className="aix-section-label">
                Readiness
              </span>

              <h4>
                {validation.current_status ===
                "published"
                  ? "Published"
                  : validation.can_publish
                    ? "Ready to publish"
                    : "Not ready to publish"}
              </h4>

              <p>
                {validation.current_status ===
                "published"
                  ? "This index is currently publicly available."
                  : validation.can_publish
                    ? `${passedChecks} of ${totalChecks} validation checks passed. The index can be published.`
                    : `${passedChecks} of ${totalChecks} validation checks passed. Return to Validate to review failed requirements.`}
              </p>
            </div>

            <span
              className="aix-badge"
              data-status={
                validation.current_status ===
                "published" ||
                validation.can_publish
                  ? "success"
                  : "warning"
              }
            >
              {validation.current_status ===
              "published"
                ? "✓ Published"
                : validation.can_publish
                  ? "✓ Ready"
                  : "○ Blocked"}
            </span>
          </div>

          <div className="publication-panel-actions">
            {validation.current_status !==
              "published" && (
              <Button
                type="button"
                onClick={() =>
                  void handlePublish()
                }
                disabled={
                  !validation.can_publish ||
                  isLoading ||
                  isPublishing
                }
                isLoading={isPublishing}
              >
                Publish index
              </Button>
            )}

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
              Refresh readiness
            </Button>

            {validation.current_status ===
              "published" && (
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