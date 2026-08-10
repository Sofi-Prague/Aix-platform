"""
Publishing & Presentation Layer

Validates and publishes indexes belonging to the authenticated user's tenant.
Publishing is explicitly gated by a pre-publish checklist.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import Dimension, Index, Indicator, User
from app.modules.identity.router import get_current_user
from app.modules.publishing.schemas import (
    PublicDimensionOut,
    PublicIndexOut,
    PublicIndicatorOut,
    PublishChecklistItem,
    PublishResponse,
    PublishValidationResponse,
)

router = APIRouter(
    prefix="/publish",
    tags=["publishing"],
)


@router.get("/ping")
def ping():
    return {
        "module": "publishing",
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


def build_publish_checklist(
    index: Index,
    db: Session,
) -> list[PublishChecklistItem]:
    dimensions = (
        db.query(Dimension)
        .filter(Dimension.index_id == index.id)
        .order_by(Dimension.order_position.asc())
        .all()
    )

    indicators: list[Indicator] = []

    for dimension in dimensions:
        dimension_indicators = (
            db.query(Indicator)
            .filter(
                Indicator.dimension_id == dimension.id,
            )
            .all()
        )

        indicators.extend(dimension_indicators)

    checklist: list[PublishChecklistItem] = []

    has_name = bool(
        index.name and index.name.strip()
    )

    checklist.append(
        PublishChecklistItem(
            key="index_name",
            label="Index has a name",
            passed=has_name,
            detail=None if has_name else (
                "Add an index name before publishing."
            ),
        )
    )

    has_description = bool(
        index.description
        and index.description.strip()
    )

    checklist.append(
        PublishChecklistItem(
            key="index_description",
            label="Index has a description",
            passed=has_description,
            detail=None if has_description else (
                "Add an index description before publishing."
            ),
        )
    )

    has_dimensions = len(dimensions) > 0

    checklist.append(
        PublishChecklistItem(
            key="dimensions_exist",
            label="Index contains at least one dimension",
            passed=has_dimensions,
            detail=None if has_dimensions else (
                "Create at least one dimension."
            ),
        )
    )

    empty_dimensions = []

    for dimension in dimensions:
        count = (
            db.query(Indicator)
            .filter(
                Indicator.dimension_id == dimension.id,
            )
            .count()
        )

        if count == 0:
            empty_dimensions.append(
                dimension.name
            )

    dimensions_have_indicators = (
        len(empty_dimensions) == 0
        and len(dimensions) > 0
    )

    checklist.append(
        PublishChecklistItem(
            key="dimensions_have_indicators",
            label="Every dimension contains indicators",
            passed=dimensions_have_indicators,
            detail=(
                None
                if dimensions_have_indicators
                else (
                    "Dimensions without indicators: "
                    + ", ".join(empty_dimensions)
                    if empty_dimensions
                    else "No dimensions are available."
                )
            ),
        )
    )

    has_indicators = len(indicators) > 0

    checklist.append(
        PublishChecklistItem(
            key="indicators_exist",
            label="Index contains indicators",
            passed=has_indicators,
            detail=None if has_indicators else (
                "Add indicators before publishing."
            ),
        )
    )

    incomplete_descriptions = [
        indicator.name
        for indicator in indicators
        if not (
            indicator.description
            and indicator.description.strip()
        )
    ]

    descriptions_complete = (
        has_indicators
        and len(incomplete_descriptions) == 0
    )

    checklist.append(
        PublishChecklistItem(
            key="indicator_descriptions",
            label="Every indicator has a description",
            passed=descriptions_complete,
            detail=(
                None
                if descriptions_complete
                else (
                    "Missing descriptions: "
                    + ", ".join(
                        incomplete_descriptions
                    )
                    if incomplete_descriptions
                    else "No indicators are available."
                )
            ),
        )
    )

    missing_units = [
        indicator.name
        for indicator in indicators
        if not (
            indicator.unit
            and indicator.unit.strip()
        )
    ]

    units_complete = (
        has_indicators
        and len(missing_units) == 0
    )

    checklist.append(
        PublishChecklistItem(
            key="indicator_units",
            label="Every indicator has a unit",
            passed=units_complete,
            detail=(
                None
                if units_complete
                else (
                    "Missing units: "
                    + ", ".join(missing_units)
                    if missing_units
                    else "No indicators are available."
                )
            ),
        )
    )

    missing_directionality = [
        indicator.name
        for indicator in indicators
        if indicator.directionality is None
    ]

    directionality_complete = (
        has_indicators
        and len(missing_directionality) == 0
    )

    checklist.append(
        PublishChecklistItem(
            key="indicator_directionality",
            label="Every indicator has directionality",
            passed=directionality_complete,
            detail=(
                None
                if directionality_complete
                else (
                    "Missing directionality: "
                    + ", ".join(
                        missing_directionality
                    )
                    if missing_directionality
                    else "No indicators are available."
                )
            ),
        )
    )

    not_ready = [
        indicator.name
        for indicator in indicators
        if indicator.status != "ready"
    ]

    all_ready = (
        has_indicators
        and len(not_ready) == 0
    )

    checklist.append(
        PublishChecklistItem(
            key="indicators_ready",
            label="Every indicator is marked Ready",
            passed=all_ready,
            detail=(
                None
                if all_ready
                else (
                    "Indicators not Ready: "
                    + ", ".join(not_ready)
                    if not_ready
                    else "No indicators are available."
                )
            ),
        )
    )

    return checklist


@router.get(
    "/indexes/{index_slug}/validate",
    response_model=PublishValidationResponse,
)
def validate_index_for_publish(
    index_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user,
    ),
):
    index = get_owned_index(
        index_slug,
        db,
        current_user,
    )

    checklist = build_publish_checklist(
        index,
        db,
    )

    return PublishValidationResponse(
        index_slug=index.slug,
        current_status=index.status,
        can_publish=all(
            item.passed
            for item in checklist
        ),
        checklist=checklist,
    )


@router.post(
    "/indexes/{index_slug}",
    response_model=PublishResponse,
)
def publish_index(
    index_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user,
    ),
):
    index = get_owned_index(
        index_slug,
        db,
        current_user,
    )

    if index.status == "published":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Index is already published",
        )

    checklist = build_publish_checklist(
        index,
        db,
    )

    failed_items = [
        item
        for item in checklist
        if not item.passed
    ]

    if failed_items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": (
                    "Index cannot be published because "
                    "the pre-publish checklist is incomplete."
                ),
                "failed_items": [
                    {
                        "key": item.key,
                        "label": item.label,
                        "detail": item.detail,
                    }
                    for item in failed_items
                ],
            },
        )

    index.status = "published"

    db.commit()
    db.refresh(index)

    return PublishResponse(
        index_slug=index.slug,
        status=index.status,
        message=(
            f'Index "{index.name}" was published successfully.'
        ),
    )

@router.get(
    "/indexes/{index_slug}/public",
    response_model=PublicIndexOut,
)
def get_public_index(
    index_slug: str,
    db: Session = Depends(get_db),
):
    index = (
        db.query(Index)
        .filter(
            Index.slug == index_slug,
            Index.status == "published",
        )
        .first()
    )

    if index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published index not found",
        )

    dimensions = (
        db.query(Dimension)
        .filter(
            Dimension.index_id == index.id,
        )
        .order_by(
            Dimension.order_position.asc(),
            Dimension.created_at.asc(),
        )
        .all()
    )

    public_dimensions: list[PublicDimensionOut] = []

    for dimension in dimensions:
        indicators = (
            db.query(Indicator)
            .filter(
                Indicator.dimension_id == dimension.id,
            )
            .order_by(
                Indicator.order_position.asc(),
                Indicator.created_at.asc(),
            )
            .all()
        )

        public_indicators = [
            PublicIndicatorOut(
                id=str(indicator.id),
                name=indicator.name,
                description=indicator.description,
                unit=indicator.unit,
                directionality=indicator.directionality,
                order_position=indicator.order_position,
            )
            for indicator in indicators
        ]

        public_dimensions.append(
            PublicDimensionOut(
                id=str(dimension.id),
                name=dimension.name,
                description=dimension.description,
                order_position=dimension.order_position,
                indicators=public_indicators,
            )
        )

    return PublicIndexOut(
        id=str(index.id),
        name=index.name,
        slug=index.slug,
        description=index.description,
        status=index.status,
        dimensions=public_dimensions,
    )