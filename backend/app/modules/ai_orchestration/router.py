"""
AI Orchestration — the AI Co-Pilot

Provides tenant-scoped methodology suggestions.
AI suggestions are returned for human review and never modify
methodology records automatically.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import Dimension, Index, Indicator, User
from app.modules.ai_orchestration.schemas import (
    DimensionSuggestionResponse,
    IndicatorSuggestionResponse,
)
from app.modules.ai_orchestration.service import (
    suggest_dimensions,
    suggest_indicators,
)
from app.modules.identity.router import get_current_user

router = APIRouter(
    prefix="/copilot",
    tags=["ai_orchestration"],
)


@router.get("/ping")
def ping():
    return {
        "module": "ai_orchestration",
        "status": "ok",
    }


def get_owned_index(
    index_slug: str,
    db: Session,
    current_user: User,
) -> Index:
    index = (
        db.query(Index)
        .filter(
            Index.slug == index_slug,
            Index.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Index '{index_slug}' not found",
        )

    return index


def get_owned_dimension(
    index: Index,
    dimension_id: uuid.UUID,
    db: Session,
) -> Dimension:
    dimension = (
        db.query(Dimension)
        .filter(
            Dimension.id == dimension_id,
            Dimension.index_id == index.id,
        )
        .first()
    )

    if dimension is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dimension not found",
        )

    return dimension


@router.post(
    "/indexes/{index_slug}/suggest-dimensions",
    response_model=DimensionSuggestionResponse,
)
def generate_dimension_suggestions(
    index_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    index = get_owned_index(
        index_slug,
        db,
        current_user,
    )

    existing_dimensions = (
        db.query(Dimension)
        .filter(Dimension.index_id == index.id)
        .all()
    )

    return suggest_dimensions(
        index_name=index.name,
        index_description=index.description,
        existing_dimension_names=[
            dimension.name
            for dimension in existing_dimensions
        ],
    )


@router.post(
    "/indexes/{index_slug}/dimensions/{dimension_id}/suggest-indicators",
    response_model=IndicatorSuggestionResponse,
)
def generate_indicator_suggestions(
    index_slug: str,
    dimension_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    index = get_owned_index(
        index_slug,
        db,
        current_user,
    )

    dimension = get_owned_dimension(
        index,
        dimension_id,
        db,
    )

    existing_indicators = (
        db.query(Indicator)
        .filter(
            Indicator.dimension_id == dimension.id,
        )
        .all()
    )

    return suggest_indicators(
        index_name=index.name,
        dimension_name=dimension.name,
        dimension_description=dimension.description,
        existing_indicator_names=[
            indicator.name
            for indicator in existing_indicators
        ],
    )