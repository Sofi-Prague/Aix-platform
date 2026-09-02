"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";

import {
  getPublishedIndex,
  type PublicIndexRecord,
} from "../../../lib/api";

export default function PublishedIndexPage() {
  const params = useParams<{ slug: string }>();

  const [index, setIndex] =
    useState<PublicIndexRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadIndex(): Promise<void> {
      if (!params.slug) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const publishedIndex = await getPublishedIndex(params.slug);
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
        <p style={{ color: "var(--aix-color-text-muted)" }}>
          {error || "This index is not available publicly."}
        </p>
      </main>
    );
  }

  const periods = [...index.periods].reverse();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--aix-color-background)",
      }}
    >
      <header
        style={{
          padding: "var(--aix-space-md) var(--aix-space-xl)",
          borderBottom: "1px solid var(--aix-color-border)",
          background: "var(--aix-color-surface)",
        }}
      >
        <strong>AIX</strong>
      </header>

      <article
        style={{
          maxWidth: "1040px",
          margin: "0 auto",
          padding: "var(--aix-space-xl) var(--aix-space-lg)",
        }}
      >
        <header style={{ marginBottom: "var(--aix-space-xl)" }}>
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

          <h1 style={{ marginTop: 0, fontSize: "36px" }}>
            {index.name}
          </h1>

          {index.description && (
            <p
              style={{
                maxWidth: "760px",
                fontSize: "18px",
                lineHeight: 1.6,
                color: "var(--aix-color-text-muted)",
              }}
            >
              {index.description}
            </p>
          )}
        </header>

        <section style={{ marginBottom: "var(--aix-space-xl)" }}>
          <h2>Results</h2>

          {periods.length === 0 ? (
            <p style={{ color: "var(--aix-color-text-muted)" }}>
              No calculated results are available.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "var(--aix-space-lg)" }}>
              {periods.map((period, periodIndex) => (
                <section
                  key={period.period}
                  style={{
                    border: "1px solid var(--aix-color-border)",
                    borderRadius: "var(--aix-radius-sm)",
                    background: "var(--aix-color-surface)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "var(--aix-space-md) var(--aix-space-lg)",
                      borderBottom: "1px solid var(--aix-color-border)",
                    }}
                  >
                    <strong>
                      {periodIndex === 0 ? "Latest ranking" : "Ranking"}
                    </strong>
                    <span
                      style={{
                        marginLeft: "8px",
                        color: "var(--aix-color-text-muted)",
                      }}
                    >
                      Period: {period.period}
                    </span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "520px",
                      }}
                    >
                      <thead>
                        <tr>
                          <TableHeader>Rank</TableHeader>
                          <TableHeader>Entity / Country</TableHeader>
                          <TableHeader align="right">Final score</TableHeader>
                        </tr>
                      </thead>
                      <tbody>
                        {period.results.map((result) => (
                          <tr key={`${period.period}-${result.entity}`}>
                            <TableCell>{result.rank}</TableCell>
                            <TableCell>
                              <strong>{result.entity}</strong>
                            </TableCell>
                            <TableCell align="right">
                              {formatScore(result.score)}
                            </TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginBottom: "var(--aix-space-xl)" }}>
          <h2>Methodology summary</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "var(--aix-space-md)",
            }}
          >
            <SummaryCard
              label="Normalization"
              value="Min-Max (0–1)"
              detail="Higher is better: (x − min) / (max − min). Lower is better: (max − x) / (max − min)."
            />
            <SummaryCard
              label="Weighting"
              value={formatWeighting(index.weighting_method)}
              detail={
                index.weighting_method === "equal"
                  ? "Dimensions and indicators are equally weighted within their respective levels."
                  : "Custom dimension and indicator weights are used for the published calculation."
              }
            />
          </div>
        </section>

        <section>
          <h2>Dimensions & indicators</h2>

          <div style={{ display: "grid", gap: "var(--aix-space-xl)" }}>
            {index.dimensions.map((dimension, dimensionIndex) => (
              <section
                key={dimension.id}
                style={{
                  paddingTop:
                    dimensionIndex === 0 ? 0 : "var(--aix-space-xl)",
                  borderTop:
                    dimensionIndex === 0
                      ? undefined
                      : "1px solid var(--aix-color-border)",
                }}
              >
                <h3 style={{ fontSize: "24px" }}>
                  {dimension.name}
                  <span
                    style={{
                      marginLeft: "10px",
                      color: "var(--aix-color-text-muted)",
                      fontSize: "14px",
                      fontWeight: 400,
                    }}
                  >
                    Weight {formatPercentage(dimension.weight)}
                  </span>
                </h3>

                {dimension.description && (
                  <p style={{ color: "var(--aix-color-text-muted)" }}>
                    {dimension.description}
                  </p>
                )}

                <div
                  style={{
                    display: "grid",
                    gap: "var(--aix-space-md)",
                    marginTop: "var(--aix-space-lg)",
                  }}
                >
                  {dimension.indicators.map((indicator) => (
                    <article
                      key={indicator.id}
                      style={{
                        padding: "var(--aix-space-lg)",
                        border: "1px solid var(--aix-color-border)",
                        borderRadius: "var(--aix-radius-sm)",
                        background: "var(--aix-color-surface)",
                      }}
                    >
                      <h4 style={{ marginTop: 0, fontSize: "18px" }}>
                        {indicator.name}
                      </h4>

                      {indicator.description && <p>{indicator.description}</p>}

                      <dl
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: "var(--aix-space-md)",
                          marginBottom: 0,
                        }}
                      >
                        <DetailField label="Unit">
                          {indicator.unit ?? "—"}
                        </DetailField>
                        <DetailField label="Directionality">
                          {formatDirectionality(indicator.directionality)}
                        </DetailField>
                        <DetailField label="Indicator weight">
                          {formatPercentage(indicator.weight)}
                        </DetailField>
                      </dl>

                      <div
                        style={{
                          marginTop: "var(--aix-space-md)",
                          paddingTop: "var(--aix-space-md)",
                          borderTop:
                            "1px solid var(--aix-color-border)",
                        }}
                      >
                        <strong>Data sources</strong>

                        {indicator.sources.length === 0 ? (
                          <p
                            style={{
                              color:
                                "var(--aix-color-text-muted)",
                              fontSize: "13px",
                            }}
                          >
                            No source metadata is available.
                          </p>
                        ) : (
                          <div
                            style={{
                              display: "grid",
                              gap: "var(--aix-space-sm)",
                              marginTop:
                                "var(--aix-space-sm)",
                            }}
                          >
                            {indicator.sources.map((source) => (
                              <div
                                key={source.id}
                                style={{
                                  padding:
                                    "var(--aix-space-sm)",
                                  background:
                                    "var(--aix-color-background)",
                                  borderRadius:
                                    "var(--aix-radius-sm)",
                                  fontSize: "13px",
                                }}
                              >
                                <strong>{source.name}</strong>
                                <div
                                  style={{
                                    marginTop: "4px",
                                    color:
                                      "var(--aix-color-text-muted)",
                                  }}
                                >
                                  {source.original_filename ??
                                    source.source_type}
                                  {" · "}
                                  {source.observation_count} observations
                                  {" · "}
                                  Periods:{" "}
                                  {source.periods_covered.join(", ") ||
                                    "—"}
                                  {" · "}
                                  Entities:{" "}
                                  {source.entities_covered.join(", ") ||
                                    "—"}
                                </div>

                                <div
                                  style={{
                                    marginTop: "4px",
                                    color:
                                      "var(--aix-color-text-muted)",
                                  }}
                                >
                                  Imported{" "}
                                  {formatDateTime(source.imported_at)}
                                  {" · "}
                                  Last updated{" "}
                                  {formatDateTime(source.last_updated)}
                                </div>

                                {source.source_url && (
                                  <div style={{ marginTop: "4px" }}>
                                    <a
                                      href={source.source_url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Source URL
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      style={{
        padding: "12px 16px",
        textAlign: align,
        fontSize: "12px",
        textTransform: "uppercase",
        color: "var(--aix-color-text-muted)",
        borderBottom: "1px solid var(--aix-color-border)",
      }}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      style={{
        padding: "14px 16px",
        textAlign: align,
        borderBottom: "1px solid var(--aix-color-border)",
      }}
    >
      {children}
    </td>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article
      style={{
        padding: "var(--aix-space-lg)",
        border: "1px solid var(--aix-color-border)",
        borderRadius: "var(--aix-radius-sm)",
        background: "var(--aix-color-surface)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "var(--aix-color-text-muted)",
          fontSize: "12px",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <strong style={{ display: "block", marginTop: "6px" }}>
        {value}
      </strong>
      <p
        style={{
          margin: "8px 0 0",
          color: "var(--aix-color-text-muted)",
          lineHeight: 1.5,
          fontSize: "14px",
        }}
      >
        {detail}
      </p>
    </article>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt
        style={{
          color: "var(--aix-color-text-muted)",
          fontSize: "12px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: "4px 0 0" }}>{children}</dd>
    </div>
  );
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2).replace(/\.00$/, "")}%`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatScore(score: number): string {
  return score.toFixed(4);
}

function formatWeighting(method: "equal" | "custom"): string {
  return method === "equal" ? "Equal weighting" : "Custom weighting";
}

function formatDirectionality(
  directionality: "higher_is_better" | "lower_is_better" | null,
): string {
  if (directionality === "higher_is_better") {
    return "Higher is better";
  }

  if (directionality === "lower_is_better") {
    return "Lower is better";
  }

  return "Not specified";
}
