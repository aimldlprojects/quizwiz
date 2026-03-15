from datetime import datetime
from typing import Any, Dict, Optional

import psycopg2
from psycopg2 import extensions


def current_millis(timestamp: Optional[int] = None) -> int:
    if timestamp is not None:
        return timestamp

    return int(datetime.utcnow().timestamp() * 1000)


def update_sync_meta(
    conn: extensions.connection,
    user_id: int,
    fields: Dict[str, Any],
) -> None:

    if not fields:
        return

    columns = []
    values = []

    for key, value in fields.items():
        columns.append(key)
        values.append(value)

    placeholders = ", ".join(["%s"] * len(values))
    column_list = ", ".join(columns)
    update_list = ", ".join(
        f"{col} = EXCLUDED.{col}" for col in columns
    )

    with conn.cursor() as cur:
        cur.execute(
            f"""
            INSERT INTO sync_meta (
                user_id,
                {column_list},
                updated_at
            )
            VALUES (
                %s,
                {placeholders},
                NOW()
            )
            ON CONFLICT (user_id)
            DO UPDATE SET
                {update_list},
                updated_at = NOW()
            """,
            [user_id, *values],
        )


def set_sync_status(
    conn: extensions.connection,
    user_id: int,
    status: str,
    message: Optional[str],
    timestamp: Optional[int] = None,
) -> None:
    millis = current_millis(timestamp)

    update_sync_meta(
        conn,
        user_id,
        {
            "sync_status": status,
            "last_sync_time": millis,
        },
    )

    if message:
        update_sync_meta(
            conn,
            user_id,
            {"error_message": message},
        )
