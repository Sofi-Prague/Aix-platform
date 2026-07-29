"use client";

import { useState } from "react";

/**
 * Three-panel Index Builder shell (PRD §6.2):
 *   Left   — dimension/indicator tree
 *   Center — detail editor for the selected indicator
 *   Right  — AI Co-Pilot, contextual to the selected dimension
 *
 * Below tablet width this collapses to a single tab-switched panel
 * (PRD "Responsive Behavior"). That collapse isn't implemented yet —
 * this is the desktop layout to build against first.
 */
export function IndexWorkspaceShell() {
  const [activeTab, setActiveTab] = useState<"tree" | "detail" | "copilot">("tree");

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Panel title="Dimensions & Indicators" className="workspace-tree">
        <EmptyState
          prompt="What does this index measure?"
          hint="First-time Author empty state — feeds the AI Co-Pilot's first round of dimension suggestions (PRD §6.2)."
        />
      </Panel>

      <Panel title="Detail" className="workspace-detail">
        <p style={{ color: "var(--aix-color-text-muted)" }}>
          Select a dimension or indicator to edit it here.
        </p>
      </Panel>

      <Panel title="AI Co-Pilot" className="workspace-copilot" isAiRegion>
        <p style={{ color: "var(--aix-color-text-muted)" }}>
          Co-Pilot suggestions will appear here, visually distinct until
          accepted (PRD §6.2 — never indistinguishable from Author content).
        </p>
      </Panel>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
  isAiRegion = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  isAiRegion?: boolean;
}) {
  return (
    <section
      className={className}
      // AI-generated content regions must be announced to screen readers
      // as such (PRD "Accessibility Requirements").
      aria-label={isAiRegion ? `${title} — AI-suggested content, not yet accepted` : title}
      style={{
        flex: 1,
        borderRight: "1px solid var(--aix-color-border)",
        padding: "var(--aix-space-md)",
        background: isAiRegion ? "var(--aix-color-ai-suggestion-bg)" : "var(--aix-color-surface)",
        overflowY: "auto",
      }}
    >
      <h2 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--aix-color-text-muted)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyState({ prompt, hint }: { prompt: string; hint: string }) {
  return (
    <div style={{ marginTop: "var(--aix-space-lg)" }}>
      <p style={{ fontSize: "16px" }}>{prompt}</p>
      <p style={{ fontSize: "13px", color: "var(--aix-color-text-muted)" }}>{hint}</p>
    </div>
  );
}
