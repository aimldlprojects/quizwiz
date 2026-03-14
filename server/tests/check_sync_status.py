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

SYNC_SECTIONS = [
    ("", "Overall"),
    ("_push", "Push"),
    ("_pull", "Pull"),
]


def fetch_sync_status():
    keys = []

    for suffix, _ in SYNC_SECTIONS:
        keys.extend(
            [
                f"sync_last_status{suffix}",
                f"sync_last_message{suffix}",
                f"sync_last_at{suffix}",
            ]
        )

    # dedupe
    keys = list(dict.fromkeys(keys))

    placeholders = ", ".join(["%s"] * len(keys))
    rows = fetch_rows(
        f"""
        SELECT key, value
        FROM settings
        WHERE key IN ({placeholders})
        """,
        keys,
    )

    mapping = {row["key"]: row["value"] for row in rows}

    result = []

    for suffix, label in SYNC_SECTIONS:
        status = mapping.get(
            f"sync_last_status{suffix}", "unknown"
        )
        message = mapping.get(
            f"sync_last_message{suffix}", ""
        )
        timestamp = mapping.get(
            f"sync_last_at{suffix}"
        )

        result.append((label, status, message, timestamp))

    return result


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
    statuses = fetch_sync_status()

    print("=" * 40)
    print("Centralized Sync Status")
    print("-" * 40)

    for label, status, message, timestamp in statuses:
        print(f"{label} status : {status}")
        print(f"{label} message: {message or 'None'}")
        print(f"{label} updated: {format_timestamp(timestamp)}")
        print("-" * 20)

    print("=" * 40)


if __name__ == "__main__":
    main()
