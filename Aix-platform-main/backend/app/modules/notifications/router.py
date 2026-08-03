"""
Notifications
Persistent (not just toast) notifications for long-running actions, categorized
as Action Required / Informational / System (Volume 2 §5.1).
"""

from fastapi import APIRouter

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/ping")
def ping():
    return {"module": "notifications", "status": "ok"}


# TODO(Week 3): GET /notifications, mark-read, category filtering
