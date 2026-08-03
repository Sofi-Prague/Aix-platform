"""
Analytics & Audit (Governance & Permissions + Analytics & Usage)
Full audit log of methodology changes (actor, timestamp, justification) —
a governance requirement, not optional (Volume 2 §4). Also tracks published-index
usage (page views, exports, API calls), separate from subject-matter data.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/audit", tags=["analytics_audit"])


@router.get("/ping")
def ping():
    return {"module": "analytics_audit", "status": "ok"}


# TODO(Week 1): audit log write path — every methodology edit, dataset upload,
# publish/unpublish must land here with a required justification note
# TODO(Week 4): usage analytics endpoints
