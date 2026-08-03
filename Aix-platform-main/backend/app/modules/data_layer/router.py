"""
Data Layer
Dataset upload, validation, versioning, mapping raw data to indicators.
Supports manual CSV/XLSX upload, scheduled imports, AI-assisted gap detection
(Volume 2 §3.2).
"""

from fastapi import APIRouter

router = APIRouter(prefix="/data", tags=["data_layer"])


@router.get("/ping")
def ping():
    return {"module": "data_layer", "status": "ok"}


# TODO(Week 2): POST /data/upload, coverage validation, dataset versioning
