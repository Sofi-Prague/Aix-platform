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

type WorkspaceStep =
  | "define"
  | "indicators"
  | "data"
  | "methodology"
  | "calculate"
  | "validate"
  | "publish";

type WorkflowStep = {
  id: WorkspaceStep;
  number: string;
  label: string;
  description: string;
};

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "define",
    number: "01",
    label: "Define",
    description:
      "Review the index purpose and core information.",
  },
  {
    id: "indicators",
    number: "02",
    label: "Indicators",
    description:
      "Build and review the index structure.",
  },
  {
    id: "data",
    number: "03",
    label: "Data",
    description:
      "Add and inspect indicator datasets.",
  },
  {
    id: "methodology",
    number: "04",
    label: "Methodology",
    description:
      "Review normalization and weighting.",
  },
  {
    id: "calculate",
    number: "05",
    label: "Calculate",
    description:
      "Calculate and inspect ranked results.",
  },
  {
    id: "validate",
    number: "06",
    label: "Validate",
    description:
      "Review publication readiness.",
  },
  {
    id: "publish",
    number: "07",
    label: "Publish",
    description:
      "Publish or manage the public index.",
  },
];

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
    activeStep,
    setActiveStep,
  ] = useState<WorkspaceStep>(
    "define",
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
          setActiveStep(
            "indicators",
          );
        }
      },
      [onSelectDimension],
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
          setActiveStep(
            "indicators",
          );
        }
      },
      [onSelectIndicator],
    );

  const activeStepIndex =
    WORKFLOW_STEPS.findIndex(
      (step) =>
        step.id === activeStep,
    );

  const activeStepInfo =
    WORKFLOW_STEPS[
      activeStepIndex
    ] ?? WORKFLOW_STEPS[0];

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
          <header
            className="index-workspace-header"
          >
            <div
              className="index-workspace-heading"
            >
              <div>
                <div
                  className="index-workspace-title-row"
                >
                  <h1>
                    {selectedIndex
                      ?.name ??
                      "Index Workspace"}
                  </h1>

                  {selectedIndex && (
                    <span
                      className="aix-badge"
                      data-status={
                        selectedIndex
                          .status ===
                        "published"
                          ? "success"
                          : "warning"
                      }
                    >
                      {selectedIndex
                        .status ===
                      "published"
                        ? "✓ Published"
                        : "○ Draft"}
                    </span>
                  )}
                </div>

                <p>
                  {selectedIndex
                    ?.description ||
                    "Build, validate and publish this research index."}
                </p>
              </div>
            </div>

            <nav
              className="aix-workflow-stepper"
              aria-label="Index research workflow"
            >
              {WORKFLOW_STEPS.map(
                (
                  step,
                  index,
                ) => {
                  const isActive =
                    step.id ===
                    activeStep;

                  const isComplete =
                    step.id ===
                    "define"
                      ? Boolean(
                          selectedIndex
                            ?.name &&
                            selectedIndex
                              ?.description,
                        )
                      : step.id ===
                          "publish"
                        ? selectedIndex
                            ?.status ===
                          "published"
                        : false;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      className="aix-workflow-step"
                      data-active={
                        isActive
                      }
                      data-complete={
                        isComplete
                      }
                      onClick={() =>
                        setActiveStep(
                          step.id,
                        )
                      }
                    >
                      <span
                        className="aix-workflow-step-number"
                      >
                        {isComplete &&
                        !isActive
                          ? "✓"
                          : step.number}
                      </span>

                      <span
                        className="aix-workflow-step-label"
                      >
                        {step.label}
                      </span>

                      {index <
                        WORKFLOW_STEPS.length -
                          1 && (
                        <span
                          className="aix-workflow-connector"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                },
              )}
            </nav>

            <div
              className="aix-workflow-context"
            >
              <strong>
                Step{" "}
                {activeStepIndex +
                  1}{" "}
                of 7 ·{" "}
                {
                  activeStepInfo.label
                }
              </strong>

              <span>
                {
                  activeStepInfo.description
                }
              </span>
            </div>
          </header>

          <div
            className="workspace-main-content"
          >
            {activeStep ===
              "define" && (
              <IndexDefinitionPanel
                selectedIndex={
                  selectedIndex
                }
              />
            )}

            {activeStep ===
              "indicators" && (
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

            {activeStep ===
              "data" && (
              <div className="workspace-step workspace-step-data">
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
              </div>
            )}

            {activeStep ===
              "methodology" && (
              <div className="workspace-step workspace-step-methodology">
                <WeightingPanel
                  key={
                    selectedIndex
                      ?.id ??
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
              </div>
            )}

            {activeStep ===
              "calculate" && (
              <div className="workspace-step workspace-step-calculate">
                <ResultsPanel
                  key={`${
                    selectedIndex
                      ?.id ??
                    "no-index"
                  }-${methodologyVersion}`}
                  selectedIndex={
                    selectedIndex
                  }
                />
              </div>
            )}

            {activeStep ===
              "validate" && (
              <div className="workspace-step workspace-step-validate">
                <PublishPanel
                  key={`validate-${
                    selectedIndex
                      ?.id ??
                    "no-index"
                  }`}
                  selectedIndex={
                    selectedIndex
                  }
                  methodologyVersion={
                    methodologyVersion
                  }
                  onPublished={
                    onIndexPublished
                  }
                  mode="validate"
                />
              </div>
            )}

            {activeStep ===
              "publish" && (
              <div className="workspace-step workspace-step-publish">
                <PublishPanel
                  key={`publish-${
                    selectedIndex
                      ?.id ??
                    "no-index"
                  }`}
                  selectedIndex={
                    selectedIndex
                  }
                  methodologyVersion={
                    methodologyVersion
                  }
                  onPublished={
                    onIndexPublished
                  }
                  mode="publish"
                />
              </div>
            )}
          </div>

          <footer className="workspace-step-navigation">
            <div>
              {activeStepIndex > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setActiveStep(
                      WORKFLOW_STEPS[
                        activeStepIndex - 1
                      ].id,
                    )
                  }
                >
                  ←{" "}
                  {
                    WORKFLOW_STEPS[
                      activeStepIndex - 1
                    ].label
                  }
                </Button>
              )}
            </div>

            <div>
              {activeStepIndex <
                WORKFLOW_STEPS.length - 1 && (
                <Button
                  type="button"
                  onClick={() =>
                    setActiveStep(
                      WORKFLOW_STEPS[
                        activeStepIndex + 1
                      ].id,
                    )
                  }
                >
                  Continue to{" "}
                  {
                    WORKFLOW_STEPS[
                      activeStepIndex + 1
                    ].label
                  }{" "}
                  →
                </Button>
              )}
            </div>
          </footer>
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
              selectedDimension
                ?.id ??
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

function IndexDefinitionPanel({
  selectedIndex,
}: {
  selectedIndex:
    | IndexRecord
    | null;
}) {
  if (!selectedIndex) {
    return (
      <StatusMessage
        type="empty"
        title="No index selected"
        message="Open an index before reviewing its definition."
      />
    );
  }

  return (
    <section
      className="index-definition-panel"
    >
      <div>
        <p
          className="aix-section-label"
        >
          Index definition
        </p>

        <h2>
          Research index overview
        </h2>

        <p>
          Review the core identity
          and purpose of this index
          before building its
          methodology.
        </p>
      </div>

      <dl
        className="index-definition-grid"
      >
        <DetailField
          label="Index name"
        >
          {selectedIndex.name}
        </DetailField>

        <DetailField
          label="Status"
        >
          {selectedIndex.status ===
          "published"
            ? "Published"
            : selectedIndex.status ===
                "archived"
              ? "Archived"
              : "Draft"}
        </DetailField>

        <DetailField
          label="URL identifier"
        >
          {selectedIndex.slug}
        </DetailField>

        <DetailField
          label="Description"
        >
          {selectedIndex.description ||
            "No description has been provided."}
        </DetailField>
      </dl>

      <div
        className="index-definition-note"
      >
        <strong>
          Definition changes
        </strong>

        <p>
          Index identity and
          description are managed
          from My Indexes.
          Methodological changes are
          made through the workflow
          steps.
        </p>
      </div>
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