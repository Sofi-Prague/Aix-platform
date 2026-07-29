"""
Index Registry
The authoring workspace container: every index (AGII is tenant zero) lives
here, isolated from other tenants but built from shared primitives (Volume 2 §3.1).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.models import Index
from app.modules.index_registry.schemas import IndexOut

router = APIRouter(prefix="/indexes", tags=["index_registry"])


@router.get("/ping")
def ping():
    return {"module": "index_registry", "status": "ok"}


@router.get("", response_model=list[IndexOut])
def list_indexes(db: Session = Depends(get_db)):
    """Returns every index record — real data from Supabase, not a stub."""
    return db.query(Index).all()


@router.get("/{slug}", response_model=IndexOut)
def get_index_by_slug(slug: str, db: Session = Depends(get_db)):
    index = db.query(Index).filter(Index.slug == slug).first()
    if not index:
        raise HTTPException(status_code=404, detail=f"Index '{slug}' not found")
    return index
