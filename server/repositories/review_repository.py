from datetime import datetime, timezone
from decimal import Decimal
import json
from psycopg2 import sql
from typing import Any, Iterable, Mapping, Optional, Tuple
from zoneinfo import ZoneInfo

from server.config.log_config import log_debug
from server.config.log_config import log_warning


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
            # `updated_at` is a TIMESTAMP (without timezone). We store values
            # via `to_timestamp(ms/1000.0)`, so we must interpret that naive
            # timestamp using the DB session timezone before extracting epoch.
            "SELECT EXTRACT(EPOCH FROM (updated_at AT TIME ZONE current_setting('TIMEZONE'))) * 1000 "
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


def _fetch_device_display_name(
    cur,
    user_id: int,
    backend_key: Optional[str],
) -> Optional[str]:

    if not backend_key:
        return None

    registry_key = f"device_registry_user_{user_id}"

    cur.execute(
        """
        SELECT value
        FROM settings
        WHERE user_id = %s
          AND key = %s
        LIMIT 1
        """,
        (user_id, registry_key),
    )

    row = cur.fetchone()

    if not row or not row[0]:
        return None

    try:
        parsed = json.loads(row[0])
    except Exception:
        return None

    if not isinstance(parsed, list):
        return None

    for entry in parsed:
        if not isinstance(entry, dict):
            continue
        if entry.get("backendKey") == backend_key:
            display_name = entry.get("displayName")
            return str(display_name) if display_name else None

    return None


def _is_practice_setting_key(key: Any) -> bool:
    if not isinstance(key, str):
        return False

    return key.startswith("tts_enabled")


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


IST = ZoneInfo("Asia/Kolkata")
FUTURE_TIMESTAMP_THRESHOLD_MS = 10 * 60 * 1000


def _fmt_ms(value: Optional[int]) -> Optional[dict[str, Any]]:

    if value is None:
        return None

    try:
        seconds = value / 1000
        return {
            "ms": value,
            "ist": datetime.fromtimestamp(
                seconds,
                tz=IST,
            ),
        }
    except Exception:
        return None


def _fmt_ts_compact(value: Optional[int]) -> Optional[str]:

    formatted = _fmt_ms(value)
    if not formatted:
        return None

    return (
        f"ms={formatted['ms']} | "
        f"ist={formatted['ist']}"
    )


def _fmt_device_tag(
    key: Optional[str],
    name: Optional[str],
) -> str:
    if key and name:
        return f"{name} ({key})"
    if key:
        return key
    if name:
        return name
    return "unknown"


def _now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def _is_future_dated(value_ms: Optional[int], now_ms: int) -> bool:
    if value_ms is None:
        return False

    return value_ms > (now_ms + FUTURE_TIMESTAMP_THRESHOLD_MS)


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
                        'sync_min_gap_ms',
                        'selected_subject_id',
                        'selected_topic_id',
                        'selected_subject_ids',
                        'selected_topic_level1_ids',
                        'selected_topic_level2_ids',
                        'tts_enabled',
                        'auto_next_enabled',
                        'auto_next_correct_delay_seconds',
                        'auto_next_wrong_delay_seconds',
                        'learn_auto_play_enabled',
                        'learn_front_delay_seconds',
                        'learn_back_delay_seconds',
                        'learn_random_order_enabled',
                        'practice_random_order_enabled',
                        'theme_mode'
                    )
                    OR key LIKE 'admin_selected_topic_path_%%'
                    OR key LIKE 'user_disabled_user_%%'
                    OR key LIKE 'practice_session_topic_%%'
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
    client_device_key: Optional[str] = None,
):

    if not settings:
        return

    cur = conn.cursor()

    for row in settings:
        key = row.get("key")
        should_log = _is_practice_setting_key(key)
        device_display_name = _fetch_device_display_name(
            cur,
            row.get("user_id", 0),
            client_device_key,
        )
        updated_at = _ms_from_value(row.get("updated_at"))
        existing_ts = _fetch_existing_updated_ms(
            cur,
            "settings",
            row.get("user_id", 0),
            "key",
            key,
        )

        now_ms = _now_ms()
        if should_log:
            if _is_future_dated(updated_at, now_ms) or _is_future_dated(
                existing_ts,
                now_ms,
            ):
                log_warning(
                    "future-dated tts setting detected",
                    {
                        "user_id": row.get("user_id", 0),
                        "key": key,
                        "incoming_updated_at": _fmt_ts_compact(updated_at),
                        "existing_updated_at": _fmt_ts_compact(existing_ts),
                        "server_now": _fmt_ts_compact(now_ms),
                        "client_device": _fmt_device_tag(
                            client_device_key,
                            device_display_name,
                        ),
                    },
                )

            log_debug(
                "upsert_settings incoming",
                {
                    "user_id": row.get("user_id", 0),
                    "key": key,
                    "value": row.get("value"),
                    "updated_at": _fmt_ts_compact(updated_at),
                    "client_device": _fmt_device_tag(
                        client_device_key,
                        device_display_name,
                    ),
                },
            )
        if existing_ts is not None and updated_at <= existing_ts:
            if should_log:
                log_debug(
                    "upsert_settings skipped older row",
                    {
                    "user_id": row.get("user_id", 0),
                    "key": key,
                    "incoming_updated_at": _fmt_ts_compact(updated_at),
                    "existing_updated_at": _fmt_ts_compact(existing_ts),
                    "client_device": _fmt_device_tag(
                        client_device_key,
                        device_display_name,
                    ),
                },
                )
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
                key,
                row["value"],
                updated_at,
                sync_version,
            ),
        )

        if should_log:
                log_debug(
                    "upsert_settings stored row",
                    {
                        "user_id": row.get("user_id", 0),
                        "key": key,
                        "value": row.get("value"),
                        "updated_at": _fmt_ts_compact(updated_at),
                        "sync_version": sync_version,
                        "client_device": _fmt_device_tag(
                            client_device_key,
                            device_display_name,
                        ),
                    },
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
