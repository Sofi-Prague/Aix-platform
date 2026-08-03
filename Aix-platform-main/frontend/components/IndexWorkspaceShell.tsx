"use client";

import { useState } from "react";

import { Button } from "./ui/Button";
import { StatusMessage } from "./ui/StatusMessage";

type WorkspaceTab = "tree" | "detail" | "copilot";

export function IndexWorkspaceShell() {
  const [activeTab, setActiveTab] =
    useState<WorkspaceTab>("tree");

  return (
    <section aria-label="Index workspace">
      <nav
        className="workspace-mobile-tabs"
        aria-label="Workspace panels"
      >
        <Button
          type="button"
          variant={
            activeTab === "tree" ? "primary" : "secondary"
          }
          onClick={() => setActiveTab("tree")}
        >
          Structure
        </Button>

        <Button
          type="button"
          variant={
            activeTab === "detail" ? "primary" : "secondary"
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
          <StatusMessage
            type="empty"
            title="What does this index measure?"
            message="Start by defining the purpose of the index. Later, the AI Co-Pilot can suggest dimensions and indicators."
          />
        </Panel>

        <Panel
          title="Detail"
          active={activeTab === "detail"}
        >
          <StatusMessage
            type="empty"
            title="Nothing selected"
            message="Select a dimension or indicator to edit its details."
          />
        </Panel>

        <Panel
          title="AI Co-Pilot"
          active={activeTab === "copilot"}
          isAiRegion
        >
          <StatusMessage
            type="empty"
            title="No suggestions yet"
            message="AI-generated suggestions will remain visually distinct until accepted."
          />
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