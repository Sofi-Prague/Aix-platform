"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  deleteDataSource,
  getDataSource,
  getDataSources,
  getNormalizedData,
  type DataSourceDetailRecord,
  type DataSourceRecord,
  type DimensionRecord,
  type IndexRecord,
  type IndicatorRecord,
  type NormalizationResponse,
  uploadDataSourceCsv,
} from "../lib/api";

import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { StatusMessage } from "./ui/StatusMessage";


type DataSourceManagerProps = {
  selectedIndex: IndexRecord;
  selectedDimension: DimensionRecord;
  selectedIndicator: IndicatorRecord;
};


export function DataSourceManager({
  selectedIndex,
  selectedDimension,
  selectedIndicator,
}: DataSourceManagerProps) {
  const [
    sources,
    setSources,
  ] = useState<DataSourceRecord[]>([]);

  const [
    selectedSource,
    setSelectedSource,
  ] =
    useState<DataSourceDetailRecord | null>(
      null,
    );

  const [sourceName, setSourceName] =
    useState("");

  const [sourceUrl, setSourceUrl] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isUploading, setIsUploading] =
    useState(false);

  const [viewingId, setViewingId] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

    const [
      normalizedData,
      setNormalizedData,
    ] = useState<NormalizationResponse | null>(
      null,
    );

    const [
      isLoadingNormalization,
      setIsLoadingNormalization,
    ] = useState(false);

    const [
      dataView,
      setDataView,
    ] = useState<"raw" | "normalized">("raw");

useEffect(() => {
  let cancelled = false;

  async function loadSources(): Promise<void> {
    setIsLoading(true);

    try {
      const result = await getDataSources(
        selectedIndex.slug,
        selectedDimension.id,
        selectedIndicator.id,
      );

      if (!cancelled) {
        setSources(result);
        setSelectedSource(null);
        setError("");
        setMessage("");
      }
    } catch (caughtError) {
      if (!cancelled) {
        setSources([]);
        setSelectedSource(null);

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load data sources.",
        );
      }
    } finally {
      if (!cancelled) {
        setIsLoading(false);
      }
    }
  }

  void loadSources();

  return () => {
    cancelled = true;
    };
    }, [
    selectedIndex.slug,
    selectedDimension.id,
    selectedIndicator.id,
    ]);


  async function handleUpload(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!sourceName.trim()) {
      setError(
        "Enter a name for the data source.",
      );
      return;
    }

    if (!file) {
      setError(
        "Choose a CSV file to upload.",
      );
      return;
    }

    setIsUploading(true);
    setError("");
    setMessage("");

    try {
      const result =
        await uploadDataSourceCsv(
          selectedIndex.slug,
          selectedDimension.id,
          selectedIndicator.id,
          {
            name: sourceName.trim(),
            sourceUrl:
              sourceUrl.trim() || undefined,
            file,
          },
        );

      setSources((current) => [
        result.data_source,
        ...current,
      ]);

      setNormalizedData(null);
      setDataView("raw");

      setSourceName("");
      setSourceUrl("");
      setFile(null);

      const fileInput =
        document.getElementById(
          "data-source-file",
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      setMessage(
        `Uploaded ${result.rows_imported} observation${
          result.rows_imported === 1
            ? ""
            : "s"
        }.`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to upload the dataset.",
      );
    } finally {
      setIsUploading(false);
    }
  }


  async function handleView(
    source: DataSourceRecord,
  ): Promise<void> {
    if (selectedSource?.id === source.id) {
      setSelectedSource(null);
      return;
    }

    setViewingId(source.id);
    setError("");

    try {
      const detail = await getDataSource(
        selectedIndex.slug,
        selectedDimension.id,
        selectedIndicator.id,
        source.id,
      );

      setSelectedSource(detail);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the dataset.",
      );
    } finally {
      setViewingId(null);
    }
  }

  async function handleLoadNormalization(): Promise<void> {
    if (
      dataView === "normalized" &&
      normalizedData
    ) {
      setDataView("raw");
      return;
    }

    if (normalizedData) {
      setDataView("normalized");
      return;
    }

    setIsLoadingNormalization(true);
    setError("");

    try {
      const result =
        await getNormalizedData(
          selectedIndex.slug,
          selectedDimension.id,
          selectedIndicator.id,
        );

      setNormalizedData(result);
      setDataView("normalized");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to normalize the indicator data.",
      );
    } finally {
      setIsLoadingNormalization(false);
    }
  }

  async function handleDelete(
    source: DataSourceRecord,
  ): Promise<void> {
    const confirmed = window.confirm(
      `Delete "${source.name}" and all of its data points?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(source.id);
    setError("");
    setMessage("");

    try {
      await deleteDataSource(
        selectedIndex.slug,
        selectedDimension.id,
        selectedIndicator.id,
        source.id,
      );

      setSources((current) =>
        current.filter(
          (item) => item.id !== source.id,
        ),
      );

      setNormalizedData(null);
      setDataView("raw");

      if (
        selectedSource?.id === source.id
      ) {
        setSelectedSource(null);
      }

      setMessage(
        `Deleted "${source.name}".`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the dataset.",
      );
    } finally {
      setDeletingId(null);
    }
  }


  return (
    <section
      aria-labelledby="data-source-heading"
      style={{
        marginTop:
          "var(--aix-space-lg)",
        paddingTop:
          "var(--aix-space-lg)",
        borderTop:
          "1px solid var(--aix-color-border)",
      }}
    >
      <div
        style={{
          marginBottom:
            "var(--aix-space-md)",
        }}
      >
        <h3
          id="data-source-heading"
          style={{
            margin: 0,
            fontSize: "16px",
          }}
        >
          Data
        </h3>

        <p
          style={{
            margin: "4px 0 0",
            color:
              "var(--aix-color-text-muted)",
            fontSize: "13px",
          }}
        >
          Data sources for{" "}
          <strong>
            {selectedIndicator.name}
          </strong>
        </p>
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
            title="Data operation failed"
            message={error}
          />
        </div>
      )}


      <div
        style={{
          marginBottom:
            "var(--aix-space-lg)",
        }}
      >
        <h4
          style={{
            marginTop: 0,
          }}
        >
          Data sources
        </h4>

        {isLoading ? (
          <StatusMessage
            type="loading"
            title="Loading data sources…"
          />
        ) : sources.length === 0 ? (
          <StatusMessage
            type="empty"
            title="No data uploaded"
            message="Upload a CSV dataset for this indicator."
          />
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap:
                "var(--aix-space-sm)",
            }}
          >
            {sources.map((source) => (
              <li
                key={source.id}
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
                <strong>
                  {source.name}
                </strong>

                <p
                  style={{
                    margin: "4px 0",
                    color:
                      "var(--aix-color-text-muted)",
                    fontSize: "13px",
                  }}
                >
                  {source.original_filename ??
                    source.source_type}
                </p>

                {source.source_url && (
                  <p
                    style={{
                      margin: "4px 0",
                      fontSize: "13px",
                    }}
                  >
                    Source:{" "}
                    <a
                      href={source.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.source_url}
                    </a>
                  </p>
                )}

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
                    disabled={
                      viewingId === source.id
                    }
                    onClick={() =>
                      void handleView(source)
                    }
                  >
                    {viewingId === source.id
                      ? "Loading…"
                      : selectedSource?.id ===
                          source.id
                        ? "Hide data"
                        : "View data"}
                  </Button>

                  <Button
                    type="button"
                    variant="danger"
                    disabled={
                      deletingId === source.id
                    }
                    onClick={() =>
                      void handleDelete(source)
                    }
                  >
                    {deletingId === source.id
                      ? "Deleting…"
                      : "Delete"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>


      {selectedSource && (
        <div
          style={{
            marginBottom:
              "var(--aix-space-xl)",
          }}
        >
          <h4>
            {selectedSource.name}
          </h4>

          <p
            style={{
              color:
                "var(--aix-color-text-muted)",
              fontSize: "13px",
            }}
          >
            {
              selectedSource.data_points
                .length
            }{" "}
            observation
            {selectedSource.data_points
              .length === 1
              ? ""
              : "s"}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--aix-space-sm)",
              marginBottom: "var(--aix-space-md)",
            }}
          >
            <Button
              type="button"
              variant={
                dataView === "raw"
                  ? "primary"
                  : "secondary"
              }
              onClick={() => setDataView("raw")}
            >
              Raw data
            </Button>

            <Button
              type="button"
              variant={
                dataView === "normalized"
                  ? "primary"
                  : "secondary"
              }
              disabled={isLoadingNormalization}
              onClick={() =>
                void handleLoadNormalization()
              }
            >
              {isLoadingNormalization
                ? "Normalizing…"
                : "Normalized data"}
            </Button>
          </div>

          {dataView === "raw" ? (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      Entity
                    </th>

                    <th style={tableHeaderStyle}>
                      Period
                    </th>

                    <th style={tableHeaderStyle}>
                      Value
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {selectedSource.data_points.map(
                    (point) => (
                      <tr key={point.id}>
                        <td style={tableCellStyle}>
                          {point.entity}
                        </td>

                        <td style={tableCellStyle}>
                          {point.period}
                        </td>

                        <td style={tableCellStyle}>
                          {point.value}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : normalizedData ? (
            <>
              <div
                style={{
                  padding: "var(--aix-space-md)",
                  marginBottom: "var(--aix-space-md)",
                  border:
                    "1px solid var(--aix-color-border)",
                  borderRadius:
                    "var(--aix-radius-sm)",
                  background:
                    "var(--aix-color-surface)",
                }}
              >
                <strong>
                  Normalization method: Min-Max (0–1)
                </strong>

                <p
                  style={{
                    margin:
                      "var(--aix-space-sm) 0 0",
                    color:
                      "var(--aix-color-text-muted)",
                    fontSize: "13px",
                  }}
                >
                  Values are normalized independently
                  within each period using the minimum
                  and maximum values for that period.
                </p>

                <div
                  style={{
                    marginTop:
                      "var(--aix-space-sm)",
                    fontSize: "13px",
                  }}
                >
                  {normalizedData.directionality ===
                  "higher_is_better" ? (
                    <>
                      <strong>
                        Higher is better:
                      </strong>{" "}
                      <code>
                        (x - min) / (max - min)
                      </code>
                    </>
                  ) : (
                    <>
                      <strong>
                        Lower is better:
                      </strong>{" "}
                      <code>
                        (max - x) / (max - min)
                      </code>
                    </>
                  )}
                </div>

                <p
                  style={{
                    margin:
                      "var(--aix-space-sm) 0 0",
                    color:
                      "var(--aix-color-text-muted)",
                    fontSize: "12px",
                  }}
                >
                  If every value in a period is equal,
                  AIX assigns a normalized score of 1.0
                  to each observation.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--aix-space-sm)",
                  marginBottom: "var(--aix-space-md)",
                }}
              >
                {normalizedData.periods.map(
                  (period) => (
                    <div
                      key={period.period}
                      style={{
                        padding: "8px 12px",
                        border:
                          "1px solid var(--aix-color-border)",
                        borderRadius:
                          "var(--aix-radius-sm)",
                        fontSize: "13px",
                      }}
                    >
                      <strong>{period.period}</strong>
                      {" · "}
                      Min {period.minimum}
                      {" · "}
                      Max {period.maximum}
                    </div>
                  ),
                )}
              </div>

              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>
                        Entity
                      </th>

                      <th style={tableHeaderStyle}>
                        Period
                      </th>

                      <th style={tableHeaderStyle}>
                        Raw value
                      </th>

                      <th style={tableHeaderStyle}>
                        Normalized
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {normalizedData.data_points.map(
                      (point, index) => (
                        <tr
                          key={`${point.entity}-${point.period}-${index}`}
                        >
                          <td style={tableCellStyle}>
                            {point.entity}
                          </td>

                          <td style={tableCellStyle}>
                            {point.period}
                          </td>

                          <td style={tableCellStyle}>
                            {point.raw_value}
                          </td>

                          <td style={tableCellStyle}>
                            {point.normalized_value.toFixed(
                              3,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}


      <form
        onSubmit={handleUpload}
        style={{
          display: "grid",
          gap: "var(--aix-space-md)",
        }}
      >
        <h4
          style={{
            margin: 0,
          }}
        >
          Upload CSV
        </h4>

        <Input
          id="data-source-name"
          name="data-source-name"
          label="Source name"
          required
          value={sourceName}
          onChange={(event) =>
            setSourceName(
              event.target.value,
            )
          }
        />

        <Input
          id="data-source-url"
          name="data-source-url"
          label="Source URL (optional)"
          type="url"
          value={sourceUrl}
          onChange={(event) =>
            setSourceUrl(
              event.target.value,
            )
          }
        />

        <div
          style={{
            display: "grid",
            gap: "var(--aix-space-sm)",
          }}
        >
          <label htmlFor="data-source-file">
            CSV file
          </label>

          <input
            id="data-source-file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(event) =>
              setFile(
                event.target.files?.[0] ??
                  null,
              )
            }
          />

          <small
            style={{
              color:
                "var(--aix-color-text-muted)",
            }}
          >
            Required columns: entity,
            period, value. Comma and
            semicolon-separated CSV files are
            supported.
          </small>
        </div>

        <div>
          <Button
            type="submit"
            isLoading={isUploading}
          >
            Upload CSV
          </Button>
        </div>
      </form>
    </section>
  );
}


const tableHeaderStyle = {
  padding: "10px",
  textAlign: "left" as const,
  borderBottom:
    "1px solid var(--aix-color-border)",
  color:
    "var(--aix-color-text-muted)",
  fontSize: "12px",
  textTransform:
    "uppercase" as const,
};


const tableCellStyle = {
  padding: "10px",
  borderBottom:
    "1px solid var(--aix-color-border)",
};