"""
Methodology Engine
Dimension/indicator tree, weighting scheme, normalization method (Volume 2 §6.2).
This is where the Index Builder's Step 2 and Step 4 screens get their data.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/methodology", tags=["methodology_engine"])


@router.get("/ping")
def ping():
    return {"module": "methodology_engine", "status": "ok"}


# TODO(Week 2): dimension/indicator CRUD, weighting config, pre-publish checklist
