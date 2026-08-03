"""
Methodology Engine

Provides dimension CRUD for indexes owned by the authenticated user's tenant.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import Dimension, Index, User
from app.modules.identity.router import get_current_user
from app.modules.methodology_engine.schemas import (
    DimensionCreate,
    DimensionOut,
    DimensionUpdate,
)

router = APIRouter(
    prefix="/methodology",
    tags=["methodology_engine"],
)


@router.get("/ping")
def ping():
    return {
        "module": "methodology_engine",
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


@router.get(
    "/indexes/{index_slug}/dimensions",
    response_model=list[DimensionOut],
)
def list_dimensions(
    index_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    index = get_owned_index(index_slug, db, current_user)

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
    index = get_owned_index(index_slug, db, current_user)

    dimension = Dimension(
        index_id=index.id,
        name=payload.name.strip(),
        description=payload.description,
        order_position=payload.order_position,
    )

    db.add(dimension)
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
    index = get_owned_index(index_slug, db, current_user)

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
    index = get_owned_index(index_slug, db, current_user)

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

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if field == "name" and value is not None:
            value = value.strip()

        setattr(dimension, field, value)

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
    index = get_owned_index(index_slug, db, current_user)

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

    db.delete(dimension)
    db.commit()

    return None