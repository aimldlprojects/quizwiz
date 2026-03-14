"""
Quick script to inspect the centralized sync status record.

Run this before and after your practice + manual sync so you can confirm
the `settings` table reflects the latest state.
"""

from datetime import datetime
import os
import sys

sys.path.insert(
    0,
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
)

from db import fetch_rows

SYNC_KEYS = [
    "sync_last_status",
    "sync_last_message",
    "sync_last_at",
]


def fetch_sync_status():
    placeholders = ", ".join(["%s"] * len(SYNC_KEYS))
    rows = fetch_rows(
        f"""
        SELECT key, value
        FROM settings
        WHERE key IN ({placeholders})
        """,
        SYNC_KEYS,
    )

    mapping = {row["key"]: row["value"] for row in rows}

    status = mapping.get("sync_last_status", "unknown")
    message = mapping.get("sync_last_message", "")
    timestamp = mapping.get("sync_last_at")

    return status, message, timestamp


def format_timestamp(value):
    if not value:
        return "Never"

    try:
        seconds = float(value)
        return datetime.fromtimestamp(seconds / 1000).strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    except ValueError:
        return value


def main():
    status, message, timestamp = fetch_sync_status()

    print("=" * 40)
    print("Centralized Sync Status")
    print("-" * 40)
    print(f"Status : {status}")
    print(f"Message: {message or 'None'}")
    print(f"Updated: {format_timestamp(timestamp)}")
    print("=" * 40)


if __name__ == "__main__":
    main()
