from datetime import datetime
import time
from typing import Any, Iterable, Mapping, Optional

import psycopg2
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor

import traceback

from db import get_db, get_db_config
from repositories.review_repository import (
    get_review_changes,
    get_changes_since_rev,
    get_settings_changes,
    get_stats_changes,
    get_user_badges_changes,
    upsert_reviews,
    upsert_settings,
    upsert_stats,
    upsert_user_badges,
)
from repositories.sync_status_repository import (
    current_millis,
    set_sync_status,
    update_sync_meta,
)
from server.config.log_config import (
    log_debug,
    log_error,
)

router = APIRouter(prefix="/reviews")


def _millis(value: Optional[Any]) -> Optional[int]:

    if value is None:
        return None

    if isinstance(value, (int, float)):
        return int(value)

    if isinstance(value, datetime):
        return int(value.timestamp() * 1000)

    try:
        numeric = float(value)
        if numeric.is_integer():
            return int(numeric)
        return int(numeric)
    except Exception:
        return None


def serialize_settings(rows: Iterable[Mapping[str, Any]]):
    return [
        {
            "user_id": row["user_id"],
            "key": row["key"],
            "value": row["value"],
            "updated_at": _millis(row.get("updated_at")),
        }
        for row in rows
    ]


def serialize_stats(rows: Iterable[Mapping[str, Any]]):
    return [
        {
            "id": row["id"],
            "user_id": row["user_id"],
            "question_id": row.get("question_id"),
            "correct": row["correct"],
            "wrong": row["wrong"],
            "practiced_at": _millis(row.get("practiced_at")),
            "updated_at": _millis(row.get("updated_at")),
        }
        for row in rows
    ]


def serialize_user_badges(rows: Iterable[Mapping[str, Any]]):
    return [
        {
            "user_id": row["user_id"],
            "badge_id": row["badge_id"],
            "unlocked_at": _millis(row.get("unlocked_at")),
            "updated_at": _millis(row.get("updated_at")),
        }
        for row in rows
    ]


@router.get("/changes")
def reviews_changes(
    user_id: int = Query(...),
    since: int = Query(0),
):

    conn = get_db()

    try:
        reviews = get_review_changes(conn, user_id, since)
        stats = serialize_stats(
            get_stats_changes(conn, user_id, since)
        )
        settings = serialize_settings(
            get_settings_changes(conn, user_id, since)
        )
        badges = serialize_user_badges(
            get_user_badges_changes(conn, user_id, since)
        )

        return {
            "reviews": reviews,
            "stats": stats,
            "settings": settings,
            "user_badges": badges,
        }
    finally:
        conn.close()


@router.post("/push")
def push_reviews(payload: dict[str, Any]):

    conn = get_db()

    try:
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=400,
                detail="user_id is required for sync",
            )

        changes = payload.get("reviews")
        if changes is None:
            changes = payload.get("changes", [])

        stats_payload = payload.get("stats", [])
        settings_payload = payload.get("settings", [])
        badges_payload = payload.get("user_badges", [])

        max_rev = upsert_reviews(conn, changes)
        upsert_stats(conn, stats_payload)
        upsert_user_badges(conn, badges_payload)
        upsert_settings(conn, settings_payload)

        conn.commit()

        now_ts = current_millis()
        now_dt = datetime.utcnow()

        update_sync_meta(
            conn,
            user_id,
            {
                "last_push_rev_id": max_rev,
                "last_sync_time": now_ts,
                "sync_status": "success",
                "last_push": now_dt,
                "last_error": None,
            },
        )

        set_sync_status(conn, user_id, "success", None, now_ts)

        return {
            "status": "ok",
            "max_rev": max_rev,
        }
    except Exception as exc:
        timestamp = current_millis()
        update_sync_meta(
            conn,
            payload.get("user_id") or 0,
            {
                "sync_status": "failed",
                "last_sync_time": timestamp,
                "last_error": str(exc),
            },
        )
        set_sync_status(
            conn,
            payload.get("user_id") or 0,
            "failed",
            str(exc),
            timestamp,
        )
        log_error("Error while pushing reviews:", exc)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
        )
    finally:
        conn.close()


@router.get("/pull")
def pull_reviews(
    user_id: int = Query(...),
    since_rev_id: int = Query(0),
):

    conn = get_db()

    try:
        start_ts = time.monotonic()
        log_debug(
            "pull_reviews start",
            {"user_id": user_id, "since_rev_id": since_rev_id},
        )
        reviews = get_changes_since_rev(
            conn,
            user_id,
            since_rev_id,
        )
        stats = serialize_stats(
            get_stats_changes(conn, user_id, since_rev_id)
        )
        settings = serialize_settings(
            get_settings_changes(conn, user_id, since_rev_id)
        )
        badges = serialize_user_badges(
            get_user_badges_changes(conn, user_id, since_rev_id)
        )

        log_debug(
            "pull_reviews fetched",
            {
                "reviews": len(reviews),
                "stats": len(stats),
                "settings": len(settings),
                "badges": len(badges),
            },
        )

        max_rev = since_rev_id
        for row in reviews:
            rev_value = row.get("rev_id") or 0
            if rev_value > max_rev:
                max_rev = rev_value

        now_ts = current_millis()
        now_dt = datetime.utcnow()

        update_sync_meta(
            conn,
            user_id,
            {
                "last_pull_rev_id": max_rev,
                "last_sync_time": now_ts,
                "sync_status": "success",
                "last_pull": now_dt,
                "last_error": None,
            },
        )

        set_sync_status(conn, user_id, "success", None, now_ts)

        duration_ms = int((time.monotonic() - start_ts) * 1000)
        log_debug(
            "pull_reviews completed",
            {"user_id": user_id, "max_rev": max_rev, "duration_ms": duration_ms},
        )

        return {
            "reviews": reviews,
            "stats": stats,
            "settings": settings,
            "user_badges": badges,
            "max_rev": max_rev,
        }
    except Exception as exc:
        log_error(
            "pull_reviews error",
            {"user_id": user_id, "error": str(exc)},
        )
        timestamp = current_millis()
        update_sync_meta(
            conn,
            user_id,
            {"sync_status": "failed", "last_sync_time": timestamp},
        )
        set_sync_status(
            conn,
            user_id,
            "failed",
            str(exc),
            timestamp,
        )
        raise
    finally:
        conn.close()


@router.get("/status")
def sync_status(user_id: int = Query(...)):
    conn = get_db()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    last_push,
                    last_pull,
                    last_error,
                    sync_status,
                    last_sync_time
                FROM sync_meta
                WHERE user_id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            row = cur.fetchone()

        if not row:
            return {
                "status": "unknown",
                "last_push": None,
                "last_pull": None,
                "last_error": None,
                "last_sync_time": None,
            }

        return {
            "status": row["sync_status"] or "unknown",
            "last_push": row["last_push"].isoformat() if row["last_push"] else None,
            "last_pull": row["last_pull"].isoformat() if row["last_pull"] else None,
            "last_error": row["last_error"],
            "last_sync_time": row["last_sync_time"],
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
