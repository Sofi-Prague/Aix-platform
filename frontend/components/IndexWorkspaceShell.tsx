"use client";

import {
  useCallback,
  useState,
  type ReactNode,
} from "react";

import {
  type DimensionRecord,
  type IndicatorRecord,
  type IndexRecord,
} from "../lib/api";

import { AICopilot } from "./AICopilot";
import { DataSourceManager } from "./DataSourceManager";
import { DimensionManager } from "./DimensionManager";
import { PublishPanel } from "./PublishPanel";
import { ResultsPanel } from "./ResultsPanel";
import { WeightingPanel } from "./WeightingPanel";
import { Button } from "./ui/Button";
import { StatusMessage } from "./ui/StatusMessage";


type MainTab =
  | "detail"
  | "data"
  | "weighting"
  | "results"
  | "publish";


type IndexWorkspaceShellProps = {
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

  onIndexPublished: () => void;
};


export function IndexWorkspaceShell({
  selectedIndex,
  selectedDimension,
  selectedIndicator,
  methodologyVersion,
  onSelectDimension,
  onSelectIndicator,
  onMethodologyChange,
  onIndexPublished,
}: IndexWorkspaceShellProps) {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<MainTab>(
      "detail",
    );

  const [
    isAiOpen,
    setIsAiOpen,
  ] = useState(false);


  const handleSelectDimension =
    useCallback(
      (
        dimension:
          | DimensionRecord
          | null,
      ): void => {
        onSelectDimension(
          dimension,
        );

        if (dimension) {
          setActiveTab(
            "detail",
          );
        }
      },
      [
        onSelectDimension,
      ],
    );


  const handleSelectIndicator =
    useCallback(
      (
        indicator:
          | IndicatorRecord
          | null,
      ): void => {
        onSelectIndicator(
          indicator,
        );

        if (indicator) {
          setActiveTab(
            "detail",
          );
        }
      },
      [
        onSelectIndicator,
      ],
    );


  return (
    <section
      aria-label="Index workspace"
      className="index-workspace"
    >
      <div
        className="index-workspace-main"
      >
        <aside
          className="index-workspace-structure"
        >
          <h2
            className="workspace-section-title"
          >
            Dimensions & Indicators
          </h2>

          <DimensionManager
            selectedIndex={
              selectedIndex
            }
            selectedDimension={
              selectedDimension
            }
            selectedIndicator={
              selectedIndicator
            }
            methodologyVersion={
              methodologyVersion
            }
            onSelectDimension={
              handleSelectDimension
            }
            onSelectIndicator={
              handleSelectIndicator
            }
            onMethodologyChange={
              onMethodologyChange
            }
          />
        </aside>


        <section
          className="index-workspace-content"
        >
          <nav
            className="workspace-main-tabs"
            aria-label="Index workspace views"
          >
            <Button
              type="button"
              variant={
                activeTab ===
                "detail"
                  ? "primary"
                  : "secondary"
              }
              onClick={() =>
                setActiveTab(
                  "detail",
                )
              }
            >
              Detail
            </Button>


            <Button
              type="button"
              variant={
                activeTab ===
                "data"
                  ? "primary"
                  : "secondary"
              }
              onClick={() =>
                setActiveTab(
                  "data",
                )
              }
            >
              Data
            </Button>


            <Button
              type="button"
              variant={
                activeTab ===
                "weighting"
                  ? "primary"
                  : "secondary"
              }
              onClick={() =>
                setActiveTab(
                  "weighting",
                )
              }
            >
              Weighting
            </Button>


            <Button
              type="button"
              variant={
                activeTab ===
                "results"
                  ? "primary"
                  : "secondary"
              }
              onClick={() =>
                setActiveTab(
                  "results",
                )
              }
            >
              Results
            </Button>


            <Button
              type="button"
              variant={
                activeTab ===
                "publish"
                  ? "primary"
                  : "secondary"
              }
              onClick={() =>
                setActiveTab(
                  "publish",
                )
              }
            >
              Publish
            </Button>
          </nav>


          <div
            className="workspace-main-content"
          >
            {activeTab ===
              "detail" && (
              <DetailPanel
                selectedIndex={
                  selectedIndex
                }
                selectedDimension={
                  selectedDimension
                }
                selectedIndicator={
                  selectedIndicator
                }
              />
            )}


            {activeTab ===
              "data" && (
              <DataPanel
                selectedIndex={
                  selectedIndex
                }
                selectedDimension={
                  selectedDimension
                }
                selectedIndicator={
                  selectedIndicator
                }
              />
            )}


            {activeTab ===
              "weighting" && (
              <WeightingPanel
                key={
                  selectedIndex?.id ??
                  "no-index"
                }
                selectedIndex={
                  selectedIndex
                }
                methodologyVersion={
                  methodologyVersion
                }
                onMethodologyChange={
                  onMethodologyChange
                }
              />
            )}


            {activeTab ===
              "results" && (
              <ResultsPanel
                key={`${
                  selectedIndex?.id ??
                  "no-index"
                }-${methodologyVersion}`}
                selectedIndex={
                  selectedIndex
                }
              />
            )}


            {activeTab ===
              "publish" && (
              <PublishPanel
                key={
                  selectedIndex?.id ??
                  "no-index"
                }
                selectedIndex={
                  selectedIndex
                }
                methodologyVersion={
                  methodologyVersion
                }
                onPublished={
                  onIndexPublished
                }
              />
            )}
          </div>
        </section>
      </div>


      <button
        type="button"
        className="ai-drawer-toggle"
        aria-expanded={
          isAiOpen
        }
        aria-controls="ai-copilot-drawer"
        onClick={() =>
          setIsAiOpen(
            (current) =>
              !current,
          )
        }
      >
        {isAiOpen
          ? "Close AI"
          : "AI Co-Pilot"}
      </button>


      <aside
        id="ai-copilot-drawer"
        className="ai-copilot-drawer"
        data-open={isAiOpen}
        aria-hidden={!isAiOpen}
      >
        <div
          className="ai-drawer-header"
        >
          <div>
            <strong>
              AI Co-Pilot
            </strong>

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
              AI-suggested content
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setIsAiOpen(
                false,
              )
            }
          >
            Close
          </Button>
        </div>


        <div
          className="ai-drawer-content"
        >
          <AICopilot
            key={`${
              selectedIndex?.id ??
              "no-index"
            }-${
              selectedDimension?.id ??
              "no-dimension"
            }`}
            selectedIndex={
              selectedIndex
            }
            selectedDimension={
              selectedDimension
            }
            onMethodologyChange={
              onMethodologyChange
            }
          />
        </div>
      </aside>


      {isAiOpen && (
        <button
          type="button"
          className="ai-drawer-backdrop"
          aria-label="Close AI Co-Pilot"
          onClick={() =>
            setIsAiOpen(
              false,
            )
          }
        />
      )}
    </section>
  );
}


function DetailPanel({
  selectedIndex,
  selectedDimension,
  selectedIndicator,
}: {
  selectedIndex:
    | IndexRecord
    | null;

  selectedDimension:
    | DimensionRecord
    | null;

  selectedIndicator:
    | IndicatorRecord
    | null;
}) {
  if (!selectedIndex) {
    return (
      <StatusMessage
        type="empty"
        title="No index selected"
        message="Open an index before viewing methodology details."
      />
    );
  }


  if (selectedIndicator) {
    return (
      <IndicatorDetail
        indicator={
          selectedIndicator
        }
      />
    );
  }


  if (selectedDimension) {
    return (
      <DimensionDetail
        dimension={
          selectedDimension
        }
      />
    );
  }


  return (
    <StatusMessage
      type="empty"
      title="Nothing selected"
      message="Select a dimension or indicator to view its details."
    />
  );
}


function DataPanel({
  selectedIndex,
  selectedDimension,
  selectedIndicator,
}: {
  selectedIndex:
    | IndexRecord
    | null;

  selectedDimension:
    | DimensionRecord
    | null;

  selectedIndicator:
    | IndicatorRecord
    | null;
}) {
  if (!selectedIndex) {
    return (
      <StatusMessage
        type="empty"
        title="No index selected"
        message="Open an index before managing data."
      />
    );
  }


  if (!selectedDimension) {
    return (
      <StatusMessage
        type="empty"
        title="No dimension selected"
        message="Select a dimension before managing data."
      />
    );
  }


  if (!selectedIndicator) {
    return (
      <StatusMessage
        type="empty"
        title="No indicator selected"
        message="Select an indicator to manage its data."
      />
    );
  }


  return (
    <DataSourceManager
      key={
        selectedIndicator.id
      }
      selectedIndex={
        selectedIndex
      }
      selectedDimension={
        selectedDimension
      }
      selectedIndicator={
        selectedIndicator
      }
    />
  );
}


function DimensionDetail({
  dimension,
}: {
  dimension: DimensionRecord;
}) {
  return (
    <div>
      <h3
        style={{
          marginTop: 0,
        }}
      >
        {dimension.name}
      </h3>

      <p>
        {dimension.description ||
          "No description has been provided."}
      </p>

      <DetailField
        label="Order position"
      >
        {
          dimension.order_position
        }
      </DetailField>
    </div>
  );
}


function IndicatorDetail({
  indicator,
}: {
  indicator: IndicatorRecord;
}) {
  return (
    <div>
      <h3
        style={{
          marginTop: 0,
        }}
      >
        {indicator.name}
      </h3>

      <p>
        {indicator.description ||
          "No description has been provided."}
      </p>

      <dl
        style={{
          display: "grid",
          gap:
            "var(--aix-space-md)",
        }}
      >
        <DetailField
          label="Unit"
        >
          {indicator.unit ||
            "Not specified"}
        </DetailField>

        <DetailField
          label="Directionality"
        >
          {formatDirectionality(
            indicator.directionality,
          )}
        </DetailField>

        <DetailField
          label="Status"
        >
          {indicator.status ===
          "ready"
            ? "Ready"
            : "Draft"}
        </DetailField>

        <DetailField
          label="Order position"
        >
          {
            indicator.order_position
          }
        </DetailField>
      </dl>
    </div>
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
          color:
            "var(--aix-color-text-muted)",
          fontSize: "12px",
          textTransform:
            "uppercase",
        }}
      >
        {label}
      </dt>

      <dd
        style={{
          margin:
            "4px 0 0",
        }}
      >
        {children}
      </dd>
    </div>
  );
}


function formatDirectionality(
  directionality:
    | "higher_is_better"
    | "lower_is_better"
    | null,
): string {
  if (
    directionality ===
    "higher_is_better"
  ) {
    return "Higher is better";
  }

  if (
    directionality ===
    "lower_is_better"
  ) {
    return "Lower is better";
  }

  return "Not specified";
}