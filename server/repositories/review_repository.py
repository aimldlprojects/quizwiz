from datetime import datetime
from decimal import Decimal
from psycopg2 import sql
from typing import Any, Iterable, Mapping, Optional, Tuple


def _timestamp_condition(
    since_rev: Optional[int],
    column: str = "updated_at",
) -> Tuple[str, list]:

    if not since_rev or since_rev <= 0:
        return "", []

    return (
        f"AND {column} >= to_timestamp(%s / 1000.0)",
        [since_rev],
    )


def _rows_to_dict(
    cursor,
    rows: Iterable[Tuple],
) -> list:

    columns = [desc[0] for desc in cursor.description]

    return [dict(zip(columns, row)) for row in rows]


def _fetch_existing_updated_ms(
    cur,
    table: str,
    user_id: int,
    key_column: str,
    key_value: Any,
) -> Optional[int]:

    cur.execute(
        sql.SQL(
            "SELECT EXTRACT(EPOCH FROM updated_at) * 1000 "
            "FROM {} "
            "WHERE user_id = %s AND {} = %s"
        ).format(
            sql.Identifier(table),
            sql.Identifier(key_column),
        ),
        (user_id, key_value),
    )

    row = cur.fetchone()

    if not row or row[0] is None:
        return None

    return int(Decimal(row[0]))


def _ms_from_value(value: Any, default: Optional[int] = None) -> int:

    if value is None:
        if default is not None:
            return default
        return int(datetime.utcnow().timestamp() * 1000)

    if isinstance(value, (int,)):
        return value

    if isinstance(value, float):
        return int(round(value))

    if isinstance(value, Decimal):
        return int(value)

    if isinstance(value, str):
        try:
            return int(float(value))
        except ValueError:
            return int(datetime.utcnow().timestamp() * 1000)

    return int(datetime.utcnow().timestamp() * 1000)


def get_changes_since_rev(
    conn,
    user_id: int,
    since_rev: int,
) -> list:

    cur = conn.cursor()

    cur.execute(
        """
        SELECT
            user_id,
            question_id,
            repetition,
            interval,
            ease_factor,
            next_review,
            last_result,
            rev_id,
            last_modified_rev,
            sync_version,
            updated_at
        FROM reviews
        WHERE user_id = %s
        AND rev_id > %s
        ORDER BY rev_id ASC
        """,
        (user_id, since_rev),
    )

    rows = cur.fetchall()
    result = _rows_to_dict(cur, rows)
    cur.close()

    return result


def get_review_changes(
    conn,
    user_id: int,
    since: int,
) -> list:

    return get_changes_since_rev(conn, user_id, since)


def upsert_reviews(
    conn,
    reviews: Iterable[Mapping[str, Any]],
) -> int:

    cur = conn.cursor()

    max_rev = 0

    for review in reviews:
        incoming_rev = review.get("rev_id") or review.get("last_modified_rev") or 0
        incoming_last_modified = review.get(
            "last_modified_rev"
        ) or incoming_rev
        sync_version = review.get("sync_version") or 1
        updated_at = review.get(
            "updated_at"
        ) or review.get("updatedAt") or None

        if isinstance(updated_at, (int, float)):
            updated_at_ts = datetime.fromtimestamp(
                float(updated_at) / 1000
            )
        elif isinstance(updated_at, str):
            try:
                updated_at_ts = datetime.fromisoformat(updated_at)
            except ValueError:
                updated_at_ts = datetime.utcnow()
        else:
            updated_at_ts = datetime.utcnow()

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
                rev_id,
                last_modified_rev,
                sync_version,
                updated_at
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (user_id, question_id)
            DO UPDATE SET
                repetition = EXCLUDED.repetition,
                interval = EXCLUDED.interval,
                ease_factor = EXCLUDED.ease_factor,
                next_review = EXCLUDED.next_review,
                last_result = EXCLUDED.last_result,
                rev_id = EXCLUDED.rev_id,
                last_modified_rev = GREATEST(
                    COALESCE(reviews.last_modified_rev, 0),
                    EXCLUDED.last_modified_rev
                ),
                sync_version = GREATEST(
                    COALESCE(reviews.sync_version, 0) + 1,
                    EXCLUDED.sync_version
                ),
                updated_at = EXCLUDED.updated_at
            WHERE reviews.rev_id IS NULL
               OR reviews.rev_id < EXCLUDED.rev_id
               OR COALESCE(
                    reviews.last_modified_rev,
                    0
                 ) < EXCLUDED.last_modified_rev
               OR reviews.updated_at <= EXCLUDED.updated_at
            """,
            (
                review["user_id"],
                review["question_id"],
                review["repetition"],
                review["interval"],
                review["ease_factor"],
                review["next_review"],
                review["last_result"],
                incoming_rev,
                incoming_last_modified,
                sync_version,
                updated_at_ts,
            ),
        )

        if incoming_rev and incoming_rev > max_rev:
            max_rev = incoming_rev

    conn.commit()
    cur.close()

    return max_rev


def get_stats_changes(
    conn,
    user_id: int,
    since_rev: int,
) -> list:

    cur = conn.cursor()

    clause, params = _timestamp_condition(
        since_rev,
        column="updated_at",
    )

    query = f"""
        SELECT
            id,
            user_id,
            question_id,
            topic_id,
            correct,
            wrong,
            practiced_at,
            updated_at
        FROM stats
        WHERE user_id = %s
        {clause}
        ORDER BY updated_at ASC
        """

    cur.execute(query, (user_id, *params))
    rows = cur.fetchall()
    result = _rows_to_dict(cur, rows)
    cur.close()

    return result


def get_settings_changes(
    conn,
    user_id: int,
    since_rev: int,
) -> list:

    cur = conn.cursor()

    clause, params = _timestamp_condition(
        since_rev,
        column="updated_at",
    )

    query = f"""
        SELECT
            user_id,
            key,
            value,
            updated_at
        FROM settings
        WHERE (
            user_id = %s
            OR (
                user_id = 0
                AND (
                    key IN (
                        'sync_mode',
                        'sync_interval_ms',
                        'sync_min_gap_ms'
                    )
                    OR key LIKE 'admin_selected_topic_path_%%'
                    OR key LIKE 'user_disabled_user_%%'
                )
            )
        )
        {clause}
        ORDER BY updated_at ASC
        """

    cur.execute(query, (user_id, *params))
    rows = cur.fetchall()
    result = _rows_to_dict(cur, rows)
    cur.close()

    return result


def get_user_badges_changes(
    conn,
    user_id: int,
    since_rev: int,
) -> list:

    cur = conn.cursor()

    clause, params = _timestamp_condition(
        since_rev,
        column="updated_at",
    )

    query = f"""
        SELECT
            user_id,
            badge_id,
            unlocked_at,
            updated_at
        FROM user_badges
        WHERE user_id = %s
        {clause}
        ORDER BY updated_at ASC
        """

    cur.execute(query, (user_id, *params))
    rows = cur.fetchall()
    result = _rows_to_dict(cur, rows)
    cur.close()

    return result


def upsert_stats(
    conn,
    stats: Iterable[Mapping[str, Any]],
):

    if not stats:
        return

    cur = conn.cursor()

    for row in stats:
        practiced_at = row.get("practiced_at")

        if isinstance(practiced_at, (int, float)):
            practiced_at = datetime.fromtimestamp(
                float(practiced_at) / 1000
            )
        elif isinstance(practiced_at, str):
            try:
                practiced_at = datetime.fromisoformat(
                    practiced_at
                )
            except ValueError:
                practiced_at = datetime.utcnow()
        else:
            practiced_at = datetime.utcnow()

        updated_at = row.get("updated_at")

        if isinstance(updated_at, (int, float)):
            updated_at = datetime.fromtimestamp(
                float(updated_at) / 1000
            )
        elif isinstance(updated_at, str):
            try:
                updated_at = datetime.fromisoformat(
                    updated_at
                )
            except ValueError:
                updated_at = datetime.utcnow()
        else:
            updated_at = datetime.utcnow()

        cur.execute(
            """
            INSERT INTO stats
            (user_id, question_id, topic_id, correct, wrong, practiced_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, question_id, practiced_at)
            DO UPDATE SET
                topic_id = COALESCE(stats.topic_id, EXCLUDED.topic_id),
                correct = EXCLUDED.correct,
                wrong = EXCLUDED.wrong,
                updated_at = EXCLUDED.updated_at
            WHERE stats.updated_at IS NULL
               OR stats.updated_at < EXCLUDED.updated_at
            """,
            (
                row["user_id"],
                row.get("question_id"),
                row.get("topic_id"),
                row["correct"],
                row["wrong"],
                practiced_at,
                updated_at,
            ),
        )

    conn.commit()
    cur.close()


def upsert_settings(
    conn,
    settings: Iterable[Mapping[str, Any]],
):

    if not settings:
        return

    cur = conn.cursor()

    for row in settings:
        updated_at = _ms_from_value(row.get("updated_at"))
        existing_ts = _fetch_existing_updated_ms(
            cur,
            "settings",
            row.get("user_id", 0),
            "key",
            row["key"],
        )
        if existing_ts is not None and updated_at <= existing_ts:
            continue
        sync_version = row.get("sync_version")
        if sync_version is None:
            sync_version = 1

        cur.execute(
            """
            INSERT INTO settings (user_id, key, value, updated_at, sync_version)
            VALUES (%s, %s, %s, to_timestamp(%s / 1000.0), %s)
            ON CONFLICT (user_id, key)
            DO UPDATE SET
                value = CASE
                    WHEN EXCLUDED.updated_at > settings.updated_at
                    THEN EXCLUDED.value
                    ELSE settings.value
                END,
                updated_at = GREATEST(settings.updated_at, EXCLUDED.updated_at)
                , sync_version = settings.sync_version + 1
            """,
            (
                row.get("user_id", 0),
                row["key"],
                row["value"],
                updated_at,
                sync_version,
            ),
        )

    conn.commit()
    cur.close()


def upsert_user_badges(
    conn,
    badges: Iterable[Mapping[str, Any]],
):

    if not badges:
        return

    cur = conn.cursor()

    for row in badges:
        user_id = row.get("user_id")

        if user_id is None:
            continue

        badge_id = row.get("badge_id")

        if not badge_id:
            continue

        unlocked_at = _ms_from_value(row.get("unlocked_at"))
        updated_at = _ms_from_value(row.get("updated_at"))
        existing_ts = _fetch_existing_updated_ms(
            cur,
            "user_badges",
            user_id,
            "badge_id",
            badge_id,
        )
        if existing_ts is not None and updated_at <= existing_ts:
            continue
        sync_version = row.get("sync_version")
        if sync_version is None:
            sync_version = 1

        cur.execute(
            """
            INSERT INTO user_badges (user_id, badge_id, unlocked_at, updated_at, sync_version)
            VALUES (%s, %s, to_timestamp(%s / 1000.0), to_timestamp(%s / 1000.0), %s)
            ON CONFLICT (user_id, badge_id)
            DO UPDATE SET
                unlocked_at = CASE
                    WHEN EXCLUDED.updated_at > user_badges.updated_at
                    THEN EXCLUDED.unlocked_at
                    ELSE user_badges.unlocked_at
                END,
                updated_at = GREATEST(user_badges.updated_at, EXCLUDED.updated_at)
                , sync_version = user_badges.sync_version + 1
            """,
            (
                user_id,
                badge_id,
                unlocked_at,
                updated_at,
                sync_version,
            ),
        )

    conn.commit()
    cur.close()
