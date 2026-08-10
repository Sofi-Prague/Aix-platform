"use client";

import { useState } from "react";

import {
  createDimension,
  createIndicator,
  suggestDimensions,
  suggestIndicators,
  type DimensionRecord,
  type DimensionSuggestion,
  type IndicatorSuggestion,
  type IndexRecord,
} from "../lib/api";

import { Button } from "./ui/Button";
import { StatusMessage } from "./ui/StatusMessage";

type AICopilotProps = {
  selectedIndex: IndexRecord | null;
  selectedDimension: DimensionRecord | null;
  onMethodologyChange: () => void;
};

export function AICopilot({
  selectedIndex,
  selectedDimension,
  onMethodologyChange,
}: AICopilotProps) {
  const [
    dimensionSuggestions,
    setDimensionSuggestions,
  ] = useState<DimensionSuggestion[]>([]);

  const [
    indicatorSuggestions,
    setIndicatorSuggestions,
  ] = useState<IndicatorSuggestion[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [acceptingIndex, setAcceptingIndex] =
    useState<number | null>(null);

  const [error, setError] = useState("");

  async function handleGenerate(): Promise<void> {
    if (!selectedIndex) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (selectedDimension) {
        const response = await suggestIndicators(
          selectedIndex.slug,
          selectedDimension.id,
        );

        setIndicatorSuggestions(
          response.suggestions,
        );

        setDimensionSuggestions([]);
      } else {
        const response = await suggestDimensions(
          selectedIndex.slug,
        );

        setDimensionSuggestions(
          response.suggestions,
        );

        setIndicatorSuggestions([]);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate AI suggestions.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function acceptDimension(
    suggestion: DimensionSuggestion,
    index: number,
  ): Promise<void> {
    if (!selectedIndex) {
      return;
    }

    setAcceptingIndex(index);
    setError("");

    try {
      await createDimension(
        selectedIndex.slug,
        {
          name: suggestion.name,
          description: suggestion.description,
          order_position: 0,
        },
      );

      setDimensionSuggestions((current) =>
        current.filter(
          (_, itemIndex) => itemIndex !== index,
        ),
      );

      onMethodologyChange();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to accept the dimension.",
      );
    } finally {
      setAcceptingIndex(null);
    }
  }

  async function acceptIndicator(
    suggestion: IndicatorSuggestion,
    index: number,
  ): Promise<void> {
    if (!selectedIndex || !selectedDimension) {
      return;
    }

    setAcceptingIndex(index);
    setError("");

    try {
      await createIndicator(
        selectedIndex.slug,
        selectedDimension.id,
        {
          name: suggestion.name,
          description: suggestion.description,
          unit: suggestion.unit,
          directionality:
            suggestion.directionality,
          status: "draft",
          order_position: 0,
        },
      );

      setIndicatorSuggestions((current) =>
        current.filter(
          (_, itemIndex) => itemIndex !== index,
        ),
      );

      onMethodologyChange();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to accept the indicator.",
      );
    } finally {
      setAcceptingIndex(null);
    }
  }

  function rejectDimension(
    index: number,
  ): void {
    setDimensionSuggestions((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  }

  function rejectIndicator(
    index: number,
  ): void {
    setIndicatorSuggestions((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  }

  if (!selectedIndex) {
    return (
      <StatusMessage
        type="empty"
        title="No index selected"
        message="Open an index before using the AI Co-Pilot."
      />
    );
  }

  const hasSuggestions =
    dimensionSuggestions.length > 0 ||
    indicatorSuggestions.length > 0;

  return (
    <div>
      <div
        style={{
          marginBottom: "var(--aix-space-md)",
        }}
      >
        <Button
          type="button"
          onClick={() => void handleGenerate()}
          isLoading={isLoading}
          disabled={
            isLoading ||
            acceptingIndex !== null
          }
        >
          {selectedDimension
            ? "Suggest indicators"
            : "Suggest dimensions"}
        </Button>
      </div>

      {selectedDimension && (
        <p
          style={{
            marginTop: 0,
            color:
              "var(--aix-color-text-muted)",
            fontSize: "13px",
          }}
        >
          Suggestions for{" "}
          <strong>
            {selectedDimension.name}
          </strong>
        </p>
      )}

      {!selectedDimension && (
        <p
          style={{
            marginTop: 0,
            color:
              "var(--aix-color-text-muted)",
            fontSize: "13px",
          }}
        >
          Suggestions for{" "}
          <strong>{selectedIndex.name}</strong>
        </p>
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
            title="AI Co-Pilot error"
            message={error}
          />
        </div>
      )}

      {!isLoading &&
        !hasSuggestions &&
        !error && (
          <StatusMessage
            type="empty"
            title="No suggestions yet"
            message={
              selectedDimension
                ? "Ask the AI Co-Pilot to suggest indicators for this dimension."
                : "Ask the AI Co-Pilot to suggest dimensions for this index."
            }
          />
        )}

      {dimensionSuggestions.length > 0 && (
        <div
          aria-label="AI-generated dimension suggestions"
          style={{
            display: "grid",
            gap: "var(--aix-space-md)",
          }}
        >
          {dimensionSuggestions.map(
            (suggestion, index) => (
              <SuggestionCard
                key={`${suggestion.name}-${index}`}
                title={suggestion.name}
                description={
                  suggestion.description
                }
                reasoning={
                  suggestion.reasoning
                }
                isAccepting={
                  acceptingIndex === index
                }
                isBusy={
                  acceptingIndex !== null
                }
                onAccept={() =>
                  void acceptDimension(
                    suggestion,
                    index,
                  )
                }
                onReject={() =>
                  rejectDimension(index)
                }
              />
            ),
          )}
        </div>
      )}

      {indicatorSuggestions.length > 0 && (
        <div
          aria-label="AI-generated indicator suggestions"
          style={{
            display: "grid",
            gap: "var(--aix-space-md)",
          }}
        >
          {indicatorSuggestions.map(
            (suggestion, index) => (
              <SuggestionCard
                key={`${suggestion.name}-${index}`}
                title={suggestion.name}
                description={
                  suggestion.description
                }
                reasoning={
                  suggestion.reasoning
                }
                metadata={[
                  suggestion.unit
                    ? `Unit: ${suggestion.unit}`
                    : "Unit: not specified",

                  suggestion.directionality ===
                  "higher_is_better"
                    ? "Directionality: higher is better"
                    : suggestion.directionality ===
                        "lower_is_better"
                      ? "Directionality: lower is better"
                      : "Directionality: not specified",
                ]}
                isAccepting={
                  acceptingIndex === index
                }
                isBusy={
                  acceptingIndex !== null
                }
                onAccept={() =>
                  void acceptIndicator(
                    suggestion,
                    index,
                  )
                }
                onReject={() =>
                  rejectIndicator(index)
                }
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  title,
  description,
  reasoning,
  metadata = [],
  isAccepting,
  isBusy,
  onAccept,
  onReject,
}: {
  title: string;
  description: string;
  reasoning: string;
  metadata?: string[];
  isAccepting: boolean;
  isBusy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <article
      aria-label="AI-suggested content, not yet accepted"
      style={{
        padding: "var(--aix-space-md)",
        border:
          "1px solid var(--aix-color-border)",
        borderRadius:
          "var(--aix-radius-sm)",
        background:
          "var(--aix-color-ai-suggestion-bg)",
      }}
    >
      <p
        style={{
          marginTop: 0,
          marginBottom:
            "var(--aix-space-xs)",
          fontSize: "12px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color:
            "var(--aix-color-text-muted)",
        }}
      >
        AI suggestion
      </p>

      <h3
        style={{
          marginTop: 0,
        }}
      >
        {title}
      </h3>

      <p>{description}</p>

      {metadata.length > 0 && (
        <div
          style={{
            marginTop:
              "var(--aix-space-sm)",
          }}
        >
          {metadata.map((item) => (
            <p
              key={item}
              style={{
                margin: "4px 0",
                color:
                  "var(--aix-color-text-muted)",
                fontSize: "13px",
              }}
            >
              {item}
            </p>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop:
            "var(--aix-space-md)",
          paddingTop:
            "var(--aix-space-sm)",
          borderTop:
            "1px solid var(--aix-color-border)",
        }}
      >
        <strong>
          Why this was suggested
        </strong>

        <p
          style={{
            marginBottom: 0,
            color:
              "var(--aix-color-text-muted)",
          }}
        >
          {reasoning}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--aix-space-sm)",
          marginTop:
            "var(--aix-space-md)",
        }}
      >
        <Button
          type="button"
          onClick={onAccept}
          isLoading={isAccepting}
          disabled={
            isBusy && !isAccepting
          }
        >
          Accept
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onReject}
          disabled={isBusy}
        >
          Reject
        </Button>
      </div>
    </article>
  );
}