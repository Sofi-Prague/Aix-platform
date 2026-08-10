import logging

import httpx

from app.core.config import settings
from app.modules.ai_orchestration.schemas import (
    DimensionSuggestion,
    DimensionSuggestionResponse,
    IndicatorSuggestion,
    IndicatorSuggestionResponse,
)

logger = logging.getLogger(__name__)


def _cloudflare_is_configured() -> bool:
    return bool(
        settings.cloudflare_account_id
        and settings.cloudflare_ai_token
    )


def _fallback_dimension_suggestions(
    existing_dimension_names: list[str],
) -> DimensionSuggestionResponse:
    suggestions = [
        DimensionSuggestion(
            name="Economic Capacity",
            description=(
                "Measures the economic resources and resilience "
                "available to support the index subject."
            ),
            reasoning=(
                "Economic capacity may influence investment, "
                "adaptation, and implementation capability."
            ),
        ),
        DimensionSuggestion(
            name="Institutional Capacity",
            description=(
                "Measures the strength, stability, and effectiveness "
                "of institutions relevant to the index."
            ),
            reasoning=(
                "Institutional capacity may influence implementation "
                "quality and long-term outcomes."
            ),
        ),
    ]

    existing_lower = {
        name.strip().lower()
        for name in existing_dimension_names
    }

    return DimensionSuggestionResponse(
        suggestions=[
            suggestion
            for suggestion in suggestions
            if suggestion.name.strip().lower()
            not in existing_lower
        ],
    )


def _fallback_indicator_suggestions(
    existing_indicator_names: list[str],
) -> IndicatorSuggestionResponse:
    suggestions = [
        IndicatorSuggestion(
            name="Resource Availability",
            description=(
                "Measures the availability of resources relevant "
                "to this dimension."
            ),
            unit="index score",
            directionality="higher_is_better",
            reasoning=(
                "Greater resource availability may indicate "
                "stronger capacity within this dimension."
            ),
        ),
        IndicatorSuggestion(
            name="Operational Risk",
            description=(
                "Measures exposure to risks that may weaken "
                "performance in this dimension."
            ),
            unit="index score",
            directionality="lower_is_better",
            reasoning=(
                "Lower operational risk generally indicates "
                "greater resilience."
            ),
        ),
    ]

    existing_lower = {
        name.strip().lower()
        for name in existing_indicator_names
    }

    return IndicatorSuggestionResponse(
        suggestions=[
            suggestion
            for suggestion in suggestions
            if suggestion.name.strip().lower()
            not in existing_lower
        ],
    )


def _run_cloudflare_model(
    *,
    prompt: str,
    response_schema: dict,
) -> dict:
    if not _cloudflare_is_configured():
        raise RuntimeError(
            "Cloudflare Workers AI is not configured."
        )

    account_id = settings.cloudflare_account_id
    token = settings.cloudflare_ai_token
    model = settings.cloudflare_ai_model

    url = (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{account_id}/ai/run/{model}"
    )

    response = httpx.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are the AIX Methodology Co-Pilot. "
                        "Return only structured output matching "
                        "the requested JSON schema."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "aix_response",
                    "schema": response_schema,
                },
            },
            "temperature": 0.2,
            "max_tokens": 1200,
        },
        timeout=60.0,
    )

    response.raise_for_status()

    body = response.json()

    if not body.get("success"):
        raise RuntimeError(
            f"Cloudflare AI request failed: "
            f"{body.get('errors')}"
        )

    result = body.get("result")

    if not isinstance(result, dict):
        raise RuntimeError(
            "Cloudflare AI returned an invalid result."
        )

    response_value = result.get("response")

    if isinstance(response_value, dict):
        return response_value

    if isinstance(response_value, str):
        import json

        return json.loads(response_value)

    raise RuntimeError(
        "Cloudflare AI returned no structured response."
    )


def suggest_dimensions(
    *,
    index_name: str,
    index_description: str | None,
    existing_dimension_names: list[str],
) -> DimensionSuggestionResponse:
    if not _cloudflare_is_configured():
        return _fallback_dimension_suggestions(
            existing_dimension_names,
        )

    prompt = f"""
Suggest exactly 3 useful high-level dimensions for a composite index.

Index name:
{index_name}

Index description:
{index_description or "No description provided."}

Existing dimensions:
{existing_dimension_names or "None"}

Requirements:
- Do not duplicate an existing dimension.
- Use concise professional names.
- Each description must explain what the dimension measures.
- Each reasoning field must explain why it belongs in the index.
- Do not invent citations.
- Do not invent statistics or factual claims.
"""

    try:
        data = _run_cloudflare_model(
            prompt=prompt,
            response_schema=(
                DimensionSuggestionResponse.model_json_schema()
            ),
        )

        result = (
            DimensionSuggestionResponse.model_validate(
                data,
            )
        )

        existing_lower = {
            name.strip().lower()
            for name in existing_dimension_names
        }

        result.suggestions = [
            suggestion
            for suggestion in result.suggestions
            if suggestion.name.strip().lower()
            not in existing_lower
        ]

        return result

    except Exception:
        logger.exception(
            "Cloudflare dimension suggestion failed."
        )

        return _fallback_dimension_suggestions(
            existing_dimension_names,
        )


def suggest_indicators(
    *,
    index_name: str,
    dimension_name: str,
    dimension_description: str | None,
    existing_indicator_names: list[str],
) -> IndicatorSuggestionResponse:
    if not _cloudflare_is_configured():
        return _fallback_indicator_suggestions(
            existing_indicator_names,
        )

    prompt = f"""
Suggest exactly 3 measurable indicators for the selected dimension.

Index:
{index_name}

Dimension:
{dimension_name}

Dimension description:
{dimension_description or "No description provided."}

Existing indicators:
{existing_indicator_names or "None"}

Requirements:
- Do not duplicate existing indicators.
- Every indicator should be measurable.
- Provide a concise description.
- Unit may be null if a responsible unit cannot be inferred.
- Directionality must be higher_is_better,
  lower_is_better, or null.
- Explain why each indicator is relevant.
- Do not invent data sources.
- Do not invent citations.
- Do not invent statistics.
"""

    try:
        data = _run_cloudflare_model(
            prompt=prompt,
            response_schema=(
                IndicatorSuggestionResponse.model_json_schema()
            ),
        )

        result = (
            IndicatorSuggestionResponse.model_validate(
                data,
            )
        )

        existing_lower = {
            name.strip().lower()
            for name in existing_indicator_names
        }

        result.suggestions = [
            suggestion
            for suggestion in result.suggestions
            if suggestion.name.strip().lower()
            not in existing_lower
        ]

        return result

    except Exception:
        logger.exception(
            "Cloudflare indicator suggestion failed."
        )

        return _fallback_indicator_suggestions(
            existing_indicator_names,
        )