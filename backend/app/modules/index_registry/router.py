"""
Index Registry
The authoring workspace container: every index (AGII is tenant zero) lives
here, isolated from other tenants but built from shared primitives (Volume 2 §3.1).
"""

from fastapi import APIRouter

router = APIRouter(prefix="/indexes", tags=["index_registry"])


@router.get("/ping")
def ping():
    return {"module": "index_registry", "status": "ok"}


# TODO(Week 1): POST /indexes (create AGII record), GET /indexes/{id}
# TODO(Week 2): dimensions/indicators CRUD lives here or in methodology_engine —
# decide the split before Step 2 screen work starts.
