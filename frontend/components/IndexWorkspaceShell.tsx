"use client";

import { useCallback, useState } from "react";

import type {
  DimensionRecord,
  IndicatorRecord,
  IndexRecord,
} from "../lib/api";

import { DimensionManager } from "./DimensionManager";
import { Button } from "./ui/Button";
import { StatusMessage } from "./ui/StatusMessage";

type WorkspaceTab = "tree" | "detail" | "copilot";

type IndexWorkspaceShellProps = {
  selectedIndex: IndexRecord | null;
  selectedDimension: DimensionRecord | null;
  selectedIndicator: IndicatorRecord | null;
  onSelectDimension: (
    dimension: DimensionRecord | null,
  ) => void;
  onSelectIndicator: (
    indicator: IndicatorRecord | null,
  ) => void;
};

export function IndexWorkspaceShell({
  selectedIndex,
  selectedDimension,
  selectedIndicator,
  onSelectDimension,
  onSelectIndicator,
}: IndexWorkspaceShellProps) {
  const [activeTab, setActiveTab] =
    useState<WorkspaceTab>("tree");

  const handleSelectDimension = useCallback(
    (dimension: DimensionRecord | null): void => {
      onSelectDimension(dimension);

      if (dimension) {
        setActiveTab("detail");
      }
    },
    [onSelectDimension],
  );

  const handleSelectIndicator = useCallback(
    (indicator: IndicatorRecord | null): void => {
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
          onClick={() => setActiveTab("tree")}
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
          onClick={() => setActiveTab("detail")}
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
          onClick={() => setActiveTab("copilot")}
        >
          AI Co-Pilot
        </Button>
      </nav>

      <div className="workspace-layout">
        <Panel
          title="Dimensions & Indicators"
          active={activeTab === "tree"}
        >
          <DimensionManager
            selectedIndex={selectedIndex}
            selectedDimension={selectedDimension}
            selectedIndicator={selectedIndicator}
            onSelectDimension={handleSelectDimension}
            onSelectIndicator={handleSelectIndicator}
          />
        </Panel>

        <Panel
          title="Detail"
          active={activeTab === "detail"}
        >
          {!selectedIndex ? (
            <StatusMessage
              type="empty"
              title="No index selected"
              message="Open an index before viewing methodology details."
            />
          ) : selectedIndicator ? (
            <div>
              <h3>{selectedIndicator.name}</h3>

              <p>
                {selectedIndicator.description ||
                  "No description has been provided."}
              </p>

              <p>
                <strong>Unit:</strong>{" "}
                {selectedIndicator.unit || "Not specified"}
              </p>

              <p>
                <strong>Directionality:</strong>{" "}
                {selectedIndicator.directionality ===
                "higher_is_better"
                  ? "Higher is better"
                  : selectedIndicator.directionality ===
                      "lower_is_better"
                    ? "Lower is better"
                    : "Not specified"}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {selectedIndicator.status}
              </p>

              <p>
                <strong>Order position:</strong>{" "}
                {selectedIndicator.order_position}
              </p>
            </div>
          ) : selectedDimension ? (
            <div>
              <h3>{selectedDimension.name}</h3>

              <p>
                {selectedDimension.description ||
                  "No description has been provided."}
              </p>

              <p>
                <strong>Order position:</strong>{" "}
                {selectedDimension.order_position}
              </p>
            </div>
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
          active={activeTab === "copilot"}
          isAiRegion
        >
          {selectedIndicator ? (
            <StatusMessage
              type="empty"
              title={`No suggestions for ${selectedIndicator.name}`}
              message="AI suggestions for indicator definitions and data sources will appear here later."
            />
          ) : selectedDimension ? (
            <StatusMessage
              type="empty"
              title={`No suggestions for ${selectedDimension.name}`}
              message="AI-generated indicator suggestions will appear here later."
            />
          ) : (
            <StatusMessage
              type="empty"
              title="No suggestions yet"
              message="Select a dimension or indicator to provide context."
            />
          )}
        </Panel>
      </div>
    </section>
  );
}

function Panel({
  title,
  children,
  active,
  isAiRegion = false,
}: {
  title: string;
  children: React.ReactNode;
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
          marginTop: 0,
          fontSize: "14px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--aix-color-text-muted)",
        }}
      >
        {title}
      </h2>

      {children}
    </section>
  );
}