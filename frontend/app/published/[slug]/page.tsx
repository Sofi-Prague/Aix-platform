"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  getPublishedIndex,
  type PublicIndexRecord,
} from "../../../lib/api";

export default function PublishedIndexPage() {
  const params = useParams<{ slug: string }>();

  const [index, setIndex] =
    useState<PublicIndexRecord | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadIndex(): Promise<void> {
      if (!params.slug) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const publishedIndex =
          await getPublishedIndex(params.slug);

        setIndex(publishedIndex);
      } catch (caughtError) {
        setIndex(null);

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load this published index.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadIndex();
  }, [params.slug]);

  if (isLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "var(--aix-space-xl)",
        }}
      >
        <p>Loading published index…</p>
      </main>
    );
  }

  if (error || !index) {
    return (
      <main
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "var(--aix-space-xl)",
        }}
      >
        <strong>AIX</strong>

        <h1>Published index not found</h1>

        <p
          style={{
            color: "var(--aix-color-text-muted)",
          }}
        >
          {error ||
            "This index is not available publicly."}
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--aix-color-background)",
      }}
    >
      <header
        style={{
          padding:
            "var(--aix-space-md) var(--aix-space-xl)",
          borderBottom:
            "1px solid var(--aix-color-border)",
          background: "var(--aix-color-surface)",
        }}
      >
        <strong>AIX</strong>
      </header>

      <article
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding:
            "var(--aix-space-xl) var(--aix-space-lg)",
        }}
      >
        <header
          style={{
            marginBottom: "var(--aix-space-xl)",
          }}
        >
          <p
            style={{
              marginBottom: "8px",
              color: "var(--aix-color-text-muted)",
              fontSize: "13px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Published Index
          </p>

          <h1
            style={{
              marginTop: 0,
              fontSize: "36px",
            }}
          >
            {index.name}
          </h1>

          {index.description && (
            <p
              style={{
                maxWidth: "720px",
                fontSize: "18px",
                lineHeight: 1.6,
                color:
                  "var(--aix-color-text-muted)",
              }}
            >
              {index.description}
            </p>
          )}
        </header>

        <div
          style={{
            display: "grid",
            gap: "var(--aix-space-xl)",
          }}
        >
          {index.dimensions.map(
            (dimension, dimensionIndex) => (
              <section
                key={dimension.id}
                style={{
                  paddingTop:
                    dimensionIndex === 0
                      ? 0
                      : "var(--aix-space-xl)",
                  borderTop:
                    dimensionIndex === 0
                      ? undefined
                      : "1px solid var(--aix-color-border)",
                }}
              >
                <h2>{dimension.name}</h2>

                {dimension.description && (
                  <p
                    style={{
                      color:
                        "var(--aix-color-text-muted)",
                    }}
                  >
                    {dimension.description}
                  </p>
                )}

                <div
                  style={{
                    display: "grid",
                    gap: "var(--aix-space-md)",
                    marginTop:
                      "var(--aix-space-lg)",
                  }}
                >
                  {dimension.indicators.map(
                    (indicator) => (
                      <article
                        key={indicator.id}
                        style={{
                          padding:
                            "var(--aix-space-lg)",
                          border:
                            "1px solid var(--aix-color-border)",
                          borderRadius:
                            "var(--aix-radius-sm)",
                          background:
                            "var(--aix-color-surface)",
                        }}
                      >
                        <h3
                          style={{
                            marginTop: 0,
                          }}
                        >
                          {indicator.name}
                        </h3>

                        {indicator.description && (
                          <p>
                            {indicator.description}
                          </p>
                        )}

                        <dl
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(180px, 1fr))",
                            gap:
                              "var(--aix-space-md)",
                            marginBottom: 0,
                          }}
                        >
                          <div>
                            <dt
                              style={{
                                color:
                                  "var(--aix-color-text-muted)",
                                fontSize: "12px",
                                textTransform:
                                  "uppercase",
                              }}
                            >
                              Unit
                            </dt>

                            <dd
                              style={{
                                margin: "4px 0 0",
                              }}
                            >
                              {indicator.unit ?? "—"}
                            </dd>
                          </div>

                          <div>
                            <dt
                              style={{
                                color:
                                  "var(--aix-color-text-muted)",
                                fontSize: "12px",
                                textTransform:
                                  "uppercase",
                              }}
                            >
                              Directionality
                            </dt>

                            <dd
                              style={{
                                margin: "4px 0 0",
                              }}
                            >
                              {formatDirectionality(
                                indicator.directionality,
                              )}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ),
                  )}
                </div>
              </section>
            ),
          )}
        </div>
      </article>
    </main>
  );
}

function formatDirectionality(
  directionality:
    | "higher_is_better"
    | "lower_is_better"
    | null,
): string {
  if (directionality === "higher_is_better") {
    return "Higher is better";
  }

  if (directionality === "lower_is_better") {
    return "Lower is better";
  }

  return "Not specified";
}