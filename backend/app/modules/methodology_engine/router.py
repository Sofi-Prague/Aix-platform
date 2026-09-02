"""
Methodology Engine

Provides tenant-scoped CRUD operations for dimensions and indicators.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import Dimension, Index, Indicator, User
from app.core.publication_state import mark_index_draft_if_published
from app.modules.identity.router import get_current_user
from app.modules.methodology_engine.schemas import (
    DimensionCreate,
    DimensionOut,
    DimensionUpdate,
    IndicatorCreate,
    IndicatorOut,
    IndicatorUpdate,
)

router = APIRouter(
    prefix="/methodology",
    tags=["methodology_engine"],
)


@router.get("/ping")
def ping():
    """Public health check for the Methodology Engine."""

    return {
        "module": "methodology_engine",
        "status": "ok",
    }


def get_owned_index(
    index_slug: str,
    db: Session,
    current_user: User,
) -> Index:
    """
    Retrieve an index belonging to the authenticated user's tenant.

    A 404 response is returned rather than exposing whether another
    tenant owns an index with the requested slug.
    """

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
    """
    Retrieve a dimension belonging to the verified parent index.
    """

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


def get_owned_indicator(
    dimension: Dimension,
    indicator_id: uuid.UUID,
    db: Session,
) -> Indicator:
    """
    Retrieve an indicator belonging to the verified parent dimension.
    """

    indicator = (
        db.query(Indicator)
        .filter(
            Indicator.id == indicator_id,
            Indicator.dimension_id == dimension.id,
        )
        .first()
    )

    if indicator is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Indicator not found",
        )

    return indicator


# ---------------------------------------------------------------------------
# Dimension routes
# ---------------------------------------------------------------------------


@router.get(
    "/indexes/{index_slug}/dimensions",
    response_model=list[DimensionOut],
)
def list_dimensions(
    index_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the dimensions belonging to an index."""

    index = get_owned_index(
        index_slug,
        db,
        current_user,
    )

    return (
        db.query(Dimension)
        .filter(Dimension.index_id == index.id)
        .order_by(
            Dimension.order_position.asc(),
            Dimension.created_at.asc(),
        )
        .all()
    )


@router.post(
    "/indexes/{index_slug}/dimensions",
    response_model=DimensionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_dimension(
    index_slug: str,
    payload: DimensionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a dimension within an index."""

    index = get_owned_index(
        index_slug,
        db,
        current_user,
    )

    dimension = Dimension(
        index_id=index.id,
        name=payload.name.strip(),
        description=payload.description,
        order_position=payload.order_position,
    )

    db.add(dimension)
    mark_index_draft_if_published(index)
    db.commit()
    db.refresh(dimension)

    return dimension


@router.get(
    "/indexes/{index_slug}/dimensions/{dimension_id}",
    response_model=DimensionOut,
)
def get_dimension(
    index_slug: str,
    dimension_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve one dimension from an index."""

    index = get_owned_index(
        index_slug,
        db,
        current_user,
    )

    return get_owned_dimension(
        index,
        dimension_id,
        db,
    )


@router.patch(
    "/indexes/{index_slug}/dimensions/{dimension_id}",
    response_model=DimensionOut,
)
def update_dimension(
    index_slug: str,
    dimension_id: uuid.UUID,
    payload: DimensionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a dimension belonging to an index."""

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

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if field == "name" and value is not None:
            value = value.strip()

        setattr(dimension, field, value)

    mark_index_draft_if_published(index)
    db.commit()
    db.refresh(dimension)

    return dimension


@router.delete(
    "/indexes/{index_slug}/dimensions/{dimension_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_dimension(
    index_slug: str,
    dimension_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a dimension.

    Indicators belonging to it are deleted by the database's
    ON DELETE CASCADE constraint.
    """

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

    db.delete(dimension)
    mark_index_draft_if_published(index)
    db.commit()

    return None


# ---------------------------------------------------------------------------
# Indicator routes
# ---------------------------------------------------------------------------


@router.get(
    "/indexes/{index_slug}/dimensions/{dimension_id}/indicators",
    response_model=list[IndicatorOut],
)
def list_indicators(
    index_slug: str,
    dimension_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List indicators belonging to a dimension."""

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

    return (
        db.query(Indicator)
        .filter(Indicator.dimension_id == dimension.id)
        .order_by(
            Indicator.order_position.asc(),
            Indicator.created_at.asc(),
        )
        .all()
    )


@router.post(
    "/indexes/{index_slug}/dimensions/{dimension_id}/indicators",
    response_model=IndicatorOut,
    status_code=status.HTTP_201_CREATED,
)
def create_indicator(
    index_slug: str,
    dimension_id: uuid.UUID,
    payload: IndicatorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an indicator within a dimension."""

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

    indicator = Indicator(
        dimension_id=dimension.id,
        name=payload.name.strip(),
        description=payload.description,
        unit=payload.unit,
        directionality=payload.directionality,
        status=payload.status,
        order_position=payload.order_position,
    )

    db.add(indicator)
    mark_index_draft_if_published(index)
    db.commit()
    db.refresh(indicator)

    return indicator


@router.get(
    "/indexes/{index_slug}/dimensions/{dimension_id}/indicators/{indicator_id}",
    response_model=IndicatorOut,
)
def get_indicator(
    index_slug: str,
    dimension_id: uuid.UUID,
    indicator_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve one indicator from a dimension."""

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

    return get_owned_indicator(
        dimension,
        indicator_id,
        db,
    )


@router.patch(
    "/indexes/{index_slug}/dimensions/{dimension_id}/indicators/{indicator_id}",
    response_model=IndicatorOut,
)
def update_indicator(
    index_slug: str,
    dimension_id: uuid.UUID,
    indicator_id: uuid.UUID,
    payload: IndicatorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an indicator belonging to a dimension."""

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

    indicator = get_owned_indicator(
        dimension,
        indicator_id,
        db,
    )

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if field == "name" and value is not None:
            value = value.strip()

        setattr(indicator, field, value)

    mark_index_draft_if_published(index)
    db.commit()
    db.refresh(indicator)

    return indicator


@router.delete(
    "/indexes/{index_slug}/dimensions/{dimension_id}/indicators/{indicator_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_indicator(
    index_slug: str,
    dimension_id: uuid.UUID,
    indicator_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an indicator from a dimension."""

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

    indicator = get_owned_indicator(
        dimension,
        indicator_id,
        db,
    )

    db.delete(indicator)
    mark_index_draft_if_published(index)
    db.commit()

    return None