from datetime import datetime
from typing import Optional

import psycopg2

STATUS_KEYS = {
    "status": "sync_last_status",
    "message": "sync_last_message",
    "timestamp": "sync_last_at",
}


def upsert_setting(
    conn: psycopg2.extensions.connection,
    key: str,
    value: str,
) -> None:

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO settings (key, value)
            VALUES (%s, %s)
            ON CONFLICT (key)
            DO UPDATE SET value = excluded.value
            """,
            (key, value),
        )


def set_sync_status(
    conn: psycopg2.extensions.connection,
    status: str,
    message: Optional[str],
    timestamp: Optional[int] = None,
) -> None:
    timestamp = timestamp or int(datetime.utcnow().timestamp() * 1000)

    upsert_setting(conn, STATUS_KEYS["status"], status)
    upsert_setting(
        conn,
        STATUS_KEYS["message"],
        message or "",
    )
    upsert_setting(
        conn,
        STATUS_KEYS["timestamp"],
        str(timestamp),
    )
