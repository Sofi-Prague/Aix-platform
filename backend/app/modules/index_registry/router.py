"""
Index Registry

Provides access to indexes inside the authenticated user's tenant.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import Index, User
from app.modules.identity.router import get_current_user
from app.modules.index_registry.schemas import IndexOut

router = APIRouter(
    prefix="/indexes",
    tags=["index_registry"],
)


@router.get("/ping")
def ping():
    """
    Public health-check endpoint for the Index Registry module.
    """
    return {
        "module": "index_registry",
        "status": "ok",
    }


@router.get("", response_model=list[IndexOut])
def list_indexes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return indexes that belong to the authenticated user's tenant.
    """
    return (
        db.query(Index)
        .filter(Index.tenant_id == current_user.tenant_id)
        .all()
    )


@router.get("/{slug}", response_model=IndexOut)
def get_index_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return one index by slug, provided it belongs to the user's tenant.
    """
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