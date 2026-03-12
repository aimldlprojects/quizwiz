from fastapi import APIRouter, Query
from typing import List, Dict, Any

from db import get_db
from repositories.review_repository import (
    get_review_changes,
    upsert_reviews
)

router = APIRouter()


# --------------------------------------------------
# Get Review Changes
# --------------------------------------------------

@router.get("/reviews/changes")
def reviews_changes(
    user_id: int = Query(...),
    since: int = Query(0)
):

    conn = get_db()

    try:

        changes = get_review_changes(
            conn,
            user_id,
            since
        )

        return {
            "changes": changes
        }

    finally:

        conn.close()


# --------------------------------------------------
# Push Reviews
# --------------------------------------------------

@router.post("/reviews/push")
def push_reviews(
    payload: Dict[str, Any]
):

    conn = get_db()

    try:

        changes: List[Dict[str, Any]] = payload.get("changes", [])

        max_rev = upsert_reviews(
            conn,
            changes
        )

        return {
            "status": "ok",
            "max_rev": max_rev
        }

    finally:

        conn.close()