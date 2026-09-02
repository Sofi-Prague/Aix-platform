"""
Index Registry

Provides CRUD access to indexes inside the authenticated user's tenant.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import Index, User
from app.core.publication_state import mark_index_draft_if_published
from app.modules.identity.router import get_current_user
from app.modules.index_registry.schemas import (
    IndexCreate,
    IndexOut,
    IndexUpdate,
)

router = APIRouter(
    prefix="/indexes",
    tags=["index_registry"],
)


@router.get("/ping")
def ping():
    return {
        "module": "index_registry",
        "status": "ok",
    }


@router.get("", response_model=list[IndexOut])
def list_indexes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Index)
        .filter(Index.tenant_id == current_user.tenant_id)
        .order_by(Index.created_at.desc())
        .all()
    )


@router.post(
    "",
    response_model=IndexOut,
    status_code=status.HTTP_201_CREATED,
)
def create_index(
    payload: IndexCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(Index)
        .filter(
            Index.tenant_id == current_user.tenant_id,
            Index.slug == payload.slug,
        )
        .first()
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Index with slug '{payload.slug}' already exists",
        )

    index = Index(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        name=payload.name.strip(),
        slug=payload.slug,
        description=payload.description,
        status="draft",
    )

    try:
        db.add(index)
        db.commit()
        db.refresh(index)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Index with slug '{payload.slug}' already exists",
        )

    return index


@router.get("/{slug}", response_model=IndexOut)
def get_index_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    index = (
        db.query(Index)
        .filter(
            Index.slug == slug,
            Index.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Index '{slug}' not found",
        )

    return index


@router.patch("/{slug}", response_model=IndexOut)
def update_index(
    slug: str,
    payload: IndexUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    index = (
        db.query(Index)
        .filter(
            Index.slug == slug,
            Index.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Index '{slug}' not found",
        )

    updates = payload.model_dump(exclude_unset=True)

    if updates.get("status") == "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Indexes can only be published through "
                "the publication validation workflow."
            ),
        )

    if "slug" in updates and updates["slug"] != index.slug:
        duplicate = (
            db.query(Index)
            .filter(
                Index.tenant_id == current_user.tenant_id,
                Index.slug == updates["slug"],
                Index.id != index.id,
            )
            .first()
        )

        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Index with slug '{updates['slug']}' "
                    "already exists"
                ),
            )

    for field, value in updates.items():
        if field == "name" and value is not None:
            value = value.strip()

        setattr(index, field, value)

    metadata_changed = any(
        field in updates
        for field in ("name", "slug", "description")
    )

    if (
        metadata_changed
        and index.status == "published"
        and updates.get("status") != "archived"
    ):
        mark_index_draft_if_published(index)

    try:
        db.commit()
        db.refresh(index)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An index with those details already exists",
        )

    return index


@router.delete(
    "/{slug}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_index(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    index = (
        db.query(Index)
        .filter(
            Index.slug == slug,
            Index.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Index '{slug}' not found",
        )

    db.delete(index)
    db.commit()

    return None