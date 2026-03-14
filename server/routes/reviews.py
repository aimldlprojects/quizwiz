from datetime import datetime
from typing import Any, Iterable, Mapping, Optional

import psycopg2
from psycopg2 import extensions
from fastapi import APIRouter, Query
from psycopg2.extras import RealDictCursor

from db import get_db, get_db_config
from repositories.review_repository import (
    get_review_changes,
    upsert_reviews,
)
from repositories.sync_status_repository import (
    set_sync_status,
)

router = APIRouter(prefix="/reviews")


def to_datetime(value: Optional[Any]) -> Optional[datetime]:

    if value is None:
        return None

    if isinstance(value, datetime):
        return value

    try:
        return datetime.fromtimestamp(
            float(value) / 1000
        )
    except Exception:
        try:
            return datetime.fromisoformat(str(value))
        except Exception:
            return None


def serialize_settings(rows: Iterable[Mapping[str, Any]]):
    return [
        {"key": row["key"], "value": row["value"]}
        for row in rows
    ]


def serialize_stats(rows: Iterable[Mapping[str, Any]]):
    return [
        {
            "id": row["id"],
            "user_id": row["user_id"],
            "correct": row["correct"],
            "wrong": row["wrong"],
            "practiced_at": (
                int(row["practiced_at"].timestamp() * 1000)
                if isinstance(row["practiced_at"], datetime)
                else row["practiced_at"]
            ),
        }
        for row in rows
    ]


def serialize_user_badges(rows: Iterable[Mapping[str, Any]]):
    return [
        {
            "user_id": row["user_id"],
            "badge_id": row["badge_id"],
            "unlocked_at": (
                int(row["unlocked_at"].timestamp() * 1000)
                if isinstance(row["unlocked_at"], datetime)
                else row["unlocked_at"]
            ),
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
        reviews = get_review_changes(
            conn,
            user_id,
            since,
        )
        stats = get_user_stats(conn, user_id)
        settings = get_settings(conn)
        badges = get_user_badges(conn, user_id)

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
        changes = payload.get("reviews")

        if changes is None:
            changes = payload.get("changes", [])

        stats_payload = payload.get("stats", [])
        settings_payload = payload.get("settings", [])
        badges_payload = payload.get("user_badges", [])

        max_rev = upsert_reviews(
            conn,
            changes,
        )

        upsert_stats(conn, stats_payload)
        upsert_user_badges(conn, badges_payload)
        upsert_settings(conn, settings_payload)

        conn.commit()

        set_sync_status(
            conn,
            "success",
            f"Synced reviews={len(changes)}, stats={len(stats_payload)}, badges={len(badges_payload)}",
        )

        return {
            "status": "ok",
            "max_rev": max_rev,
        }
    except Exception as exc:
        set_sync_status(
            conn,
            "failed",
            str(exc),
        )
        raise
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


def get_user_stats(conn, user_id: int):

    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT id, user_id, correct, wrong, practiced_at
            FROM stats
            WHERE user_id = %s
            """,
            (user_id,),
        )

        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]

        return serialize_stats(
            [dict(zip(columns, row)) for row in rows]
        )
    finally:
        cur.close()


def get_settings(conn):

    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT key, value
            FROM settings
            """
        )

        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]

        return serialize_settings(
            [dict(zip(columns, row)) for row in rows]
        )
    finally:
        cur.close()


def get_user_badges(conn, user_id: int):

    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT user_id, badge_id, unlocked_at
            FROM user_badges
            WHERE user_id = %s
            """,
            (user_id,),
        )

        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]

        return serialize_user_badges(
            [dict(zip(columns, row)) for row in rows]
        )
    finally:
        cur.close()


def upsert_stats(
    conn: extensions.connection,
    stats: list[Mapping[str, Any]],
):

    if not stats:
        return

    with conn.cursor() as cur:
        for row in stats:
            practiced_at = to_datetime(
                row.get("practiced_at")
            )

            cur.execute(
                """
                INSERT INTO stats
                (id, user_id, correct, wrong, practiced_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id)
                DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    correct = EXCLUDED.correct,
                    wrong = EXCLUDED.wrong,
                    practiced_at = EXCLUDED.practiced_at
                """,
                (
                    row.get("id"),
                    row["user_id"],
                    row["correct"],
                    row["wrong"],
                    practiced_at,
                ),
            )


def upsert_settings(
    conn: extensions.connection,
    settings: list[Mapping[str, Any]],
):

    if not settings:
        return

    with conn.cursor() as cur:
        for row in settings:
            cur.execute(
                """
                INSERT INTO settings
                (key, value)
                VALUES (%s, %s)
                ON CONFLICT (key)
                DO UPDATE SET value = excluded.value
                """,
                (row["key"], row["value"]),
            )


def upsert_user_badges(
    conn: extensions.connection,
    badges: list[Mapping[str, Any]],
):

    if not badges:
        return

    with conn.cursor() as cur:
        for row in badges:
            if not isinstance(row, Mapping):
                continue

            user_id = (
                row.get("user_id")
                or row.get("userId")
                or row.get("user")
            )
            badge_id = (
                row.get("badge_id")
                or row.get("badgeId")
                or row.get("badge")
            )

            if user_id is None or badge_id is None:
                continue

            unlocked_at = to_datetime(
                row.get("unlocked_at")
                or row.get("unlockedAt")
            )

            cur.execute(
                """
                INSERT INTO user_badges
                (user_id, badge_id, unlocked_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, badge_id)
                DO UPDATE SET
                    unlocked_at = EXCLUDED.unlocked_at
                """,
                (
                    user_id,
                    badge_id,
                    unlocked_at,
                ),
            )
