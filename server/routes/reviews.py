from typing import Any

import psycopg2
from fastapi import APIRouter, Query
from psycopg2.extras import RealDictCursor

from db import get_db, get_db_config
from repositories.review_repository import (
    get_review_changes,
    upsert_reviews,
)

router = APIRouter(prefix="/reviews")


@router.get("/changes")
def reviews_changes(
    user_id: int = Query(...),
    since: int = Query(0),
):

    conn = get_db()

    try:
        changes = get_review_changes(
            conn,
            user_id,
            since,
        )

        return {
            "changes": changes
        }
    finally:
        conn.close()


@router.post("/push")
def push_reviews(payload: dict[str, Any]):

    conn = get_db()

    try:
        changes = payload.get("changes", [])

        max_rev = upsert_reviews(
            conn,
            changes,
        )

        return {
            "status": "ok",
            "max_rev": max_rev,
        }
    finally:
        conn.close()


@router.get("/due")
def get_due_reviews(
    user_id: int,
    limit: int = 20,
):

    config = get_db_config()
    conn = psycopg2.connect(**config)

    try:
        with conn.cursor(
            cursor_factory=RealDictCursor
        ) as cur:
            cur.execute(
                """
                SELECT *
                FROM reviews
                WHERE user_id = %s
                AND (
                    next_review IS NULL
                    OR next_review <=
                      EXTRACT(EPOCH FROM NOW()) * 1000
                )
                ORDER BY rev_id ASC
                LIMIT %s
                """,
                (user_id, limit),
            )

            rows = cur.fetchall()

            return rows
    finally:
        conn.close()


@router.post("/update")
def update_review(data: dict[str, Any]):

    config = get_db_config()
    conn = psycopg2.connect(**config)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reviews
                (
                    user_id,
                    question_id,
                    repetition,
                    interval,
                    ease_factor,
                    next_review,
                    last_result,
                    rev_id
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (user_id, question_id)
                DO UPDATE SET
                    repetition = EXCLUDED.repetition,
                    interval = EXCLUDED.interval,
                    ease_factor = EXCLUDED.ease_factor,
                    next_review = EXCLUDED.next_review,
                    last_result = EXCLUDED.last_result,
                    rev_id = EXCLUDED.rev_id
                """,
                (
                    data["user_id"],
                    data["question_id"],
                    data["repetition"],
                    data["interval"],
                    data["ease_factor"],
                    data["next_review"],
                    data["last_result"],
                    data["rev_id"],
                ),
            )

        conn.commit()

        return {"status": "ok"}
    finally:
        conn.close()
