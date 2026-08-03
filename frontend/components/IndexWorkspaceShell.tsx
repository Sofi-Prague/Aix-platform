"use client";

import { useCallback, useState } from "react";

import type {
  DimensionRecord,
  IndexRecord,
} from "../lib/api";
import { DimensionManager } from "./DimensionManager";
import { Button } from "./ui/Button";
import { StatusMessage } from "./ui/StatusMessage";

type WorkspaceTab = "tree" | "detail" | "copilot";

type IndexWorkspaceShellProps = {
  selectedIndex: IndexRecord | null;
  selectedDimension: DimensionRecord | null;
  onSelectDimension: (
    dimension: DimensionRecord | null,
  ) => void;
};

export function IndexWorkspaceShell({
  selectedIndex,
  selectedDimension,
  onSelectDimension,
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
            onSelectDimension={handleSelectDimension}
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
          ) : selectedDimension ? (
            <div>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "var(--aix-space-md)",
                }}
              >
                {selectedDimension.name}
              </h3>

              <div
                style={{
                  display: "grid",
                  gap: "var(--aix-space-md)",
                }}
              >
                <div>
                  <strong>Description</strong>

                  <p
                    style={{
                      marginBottom: 0,
                      color:
                        "var(--aix-color-text-muted)",
                    }}
                  >
                    {selectedDimension.description ||
                      "No description has been provided."}
                  </p>
                </div>

                <div>
                  <strong>Order position</strong>

                  <p
                    style={{
                      marginBottom: 0,
                      color:
                        "var(--aix-color-text-muted)",
                    }}
                  >
                    {selectedDimension.order_position}
                  </p>
                </div>

                <div>
                  <strong>Dimension ID</strong>

                  <p
                    style={{
                      marginBottom: 0,
                      color:
                        "var(--aix-color-text-muted)",
                      wordBreak: "break-all",
                    }}
                  >
                    {selectedDimension.id}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <StatusMessage
              type="empty"
              title="Nothing selected"
              message="Select a dimension to view its details."
            />
          )}
        </Panel>

        <Panel
          title="AI Co-Pilot"
          active={activeTab === "copilot"}
          isAiRegion
        >
          {!selectedIndex ? (
            <StatusMessage
              type="empty"
              title="No index selected"
              message="Open an index before requesting methodology suggestions."
            />
          ) : selectedDimension ? (
            <StatusMessage
              type="empty"
              title={`No suggestions for ${selectedDimension.name}`}
              message="AI-generated dimension and indicator suggestions will appear here later and remain visually distinct until accepted."
            />
          ) : (
            <StatusMessage
              type="empty"
              title="No suggestions yet"
              message="Select a dimension to provide context for future AI suggestions."
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