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
import { DimensionManager } from "./DimensionManager";
import { PublishPanel } from "./PublishPanel";
import { Button } from "./ui/Button";
import { StatusMessage } from "./ui/StatusMessage";

type WorkspaceTab =
  | "tree"
  | "detail"
  | "copilot"
  | "publish";

type IndexWorkspaceShellProps = {
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
  const [activeTab, setActiveTab] =
    useState<WorkspaceTab>("tree");

  const handleSelectDimension = useCallback(
    (
      dimension: DimensionRecord | null,
    ): void => {
      onSelectDimension(dimension);

      if (dimension) {
        setActiveTab("detail");
      }
    },
    [onSelectDimension],
  );

  const handleSelectIndicator = useCallback(
    (
      indicator: IndicatorRecord | null,
    ): void => {
      onSelectIndicator(indicator);

      if (indicator) {
        setActiveTab("detail");
      }
    },
    [onSelectIndicator],
  );

  return (
    <section aria-label="Index workspace">
      <nav
        className="workspace-mobile-tabs"
        aria-label="Workspace panels"
      >
        <Button
          type="button"
          variant={
            activeTab === "tree"
              ? "primary"
              : "secondary"
          }
          onClick={() =>
            setActiveTab("tree")
          }
        >
          Structure
        </Button>

        <Button
          type="button"
          variant={
            activeTab === "detail"
              ? "primary"
              : "secondary"
          }
          onClick={() =>
            setActiveTab("detail")
          }
        >
          Detail
        </Button>

        <Button
          type="button"
          variant={
            activeTab === "copilot"
              ? "primary"
              : "secondary"
          }
          onClick={() =>
            setActiveTab("copilot")
          }
        >
          AI Co-Pilot
        </Button>

        <Button
          type="button"
          variant={
            activeTab === "publish"
              ? "primary"
              : "secondary"
          }
          onClick={() =>
            setActiveTab("publish")
          }
        >
          Publish
        </Button>
      </nav>

      <div className="workspace-layout">
        <Panel
          title="Dimensions & Indicators"
          active={activeTab === "tree"}
        >
          <DimensionManager
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
        </Panel>

        <Panel
          title="Detail"
          active={
            activeTab === "detail"
          }
        >
          {!selectedIndex ? (
            <StatusMessage
              type="empty"
              title="No index selected"
              message="Open an index before viewing methodology details."
            />
          ) : selectedIndicator ? (
            <IndicatorDetail
              indicator={
                selectedIndicator
              }
            />
          ) : selectedDimension ? (
            <DimensionDetail
              dimension={
                selectedDimension
              }
            />
          ) : (
            <StatusMessage
              type="empty"
              title="Nothing selected"
              message="Select a dimension or indicator to view its details."
            />
          )}
        </Panel>

        <Panel
          title="AI Co-Pilot"
          active={
            activeTab === "copilot"
          }
          isAiRegion
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
        </Panel>

        <Panel
          title="Publish"
          active={
            activeTab === "publish"
          }
        >
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
        </Panel>
      </div>
    </section>
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

      <dl
        style={{
          display: "grid",
          gap: "var(--aix-space-md)",
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
            Order position
          </dt>

          <dd
            style={{
              margin: "4px 0 0",
            }}
          >
            {dimension.order_position}
          </dd>
        </div>
      </dl>
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
          gap: "var(--aix-space-md)",
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
            {indicator.unit ||
              "Not specified"}
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
            Status
          </dt>

          <dd
            style={{
              margin: "4px 0 0",
            }}
          >
            {indicator.status ===
            "ready"
              ? "Ready"
              : "Draft"}
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
            Order position
          </dt>

          <dd
            style={{
              margin: "4px 0 0",
            }}
          >
            {
              indicator.order_position
            }
          </dd>
        </div>
      </dl>
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

function Panel({
  title,
  children,
  active,
  isAiRegion = false,
}: {
  title: string;
  children: ReactNode;
  active: boolean;
  isAiRegion?: boolean;
}) {
  return (
    <section
      className="workspace-panel"
      data-active={active}
      aria-label={
        isAiRegion
          ? `${title} — AI-suggested content`
          : title
      }
      style={{
        background: isAiRegion
          ? "var(--aix-color-ai-suggestion-bg)"
          : undefined,
      }}
    >
      <h2
        style={{
          fontSize: "14px",
          textTransform:
            "uppercase",
          letterSpacing: "0.05em",
          color:
            "var(--aix-color-text-muted)",
        }}
      >
        {title}
      </h2>

      {children}
    </section>
  );
}