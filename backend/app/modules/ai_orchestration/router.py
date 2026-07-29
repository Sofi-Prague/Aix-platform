"""
AI Orchestration — the AI Co-Pilot
Recommends indicators, proposes weighting rationale, flags statistical issues,
drafts narrative text. RAG-grounded; every output persists a provenance record
(prompt, model, inputs, human acceptance decision). Never auto-publishes
(Volume 1 §5, Volume 2 §5.1).
"""

from fastapi import APIRouter

router = APIRouter(prefix="/copilot", tags=["ai_orchestration"])


@router.get("/ping")
def ping():
    return {"module": "ai_orchestration", "status": "ok"}


# TODO(Week 3): suggestion endpoints per Index Builder step, provenance logging,
# graceful degraded mode when the AI service is unavailable (PRD §6.3 edge case)
