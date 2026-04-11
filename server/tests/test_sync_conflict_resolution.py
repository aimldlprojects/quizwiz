import time
from datetime import datetime, timezone

import pytest
import requests

from db import execute_write, fetch_rows

BASE_URL = "http://192.168.29.74:8000"


@pytest.fixture(autouse=True)
def clean_sync_test_rows():

    execute_write(
        "DELETE FROM settings WHERE key='sync_conflict_setting'"
    )
    execute_write(
        "DELETE FROM user_badges WHERE badge_id='conflict_badge'",
    )
    execute_write(
        "DELETE FROM stats WHERE question_id IN ('conflict_test','roundtrip_question')",
    )

    yield

    execute_write(
        "DELETE FROM settings WHERE key='sync_conflict_setting'"
    )
    execute_write(
        "DELETE FROM user_badges WHERE badge_id='conflict_badge'",
    )
    execute_write(
        "DELETE FROM stats WHERE question_id IN ('conflict_test','roundtrip_question')",
    )


def wait_for_server(timeout=10):
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = requests.get(f"{BASE_URL}/docs")
            if resp.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    raise RuntimeError("Server did not become available in time")


def current_millis():
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def push_payload(payload):
    wait_for_server()
    resp = requests.post(f"{BASE_URL}/reviews/push", json=payload)
    if not resp.ok:
        print("Push error", resp.status_code)
        try:
            print("   Detail:", resp.json())
        except Exception:
            print("   Text:", resp.text)
    resp.raise_for_status()
    return resp.json()


def query_stats_row(user_id, question_id, practiced_at_ms):
    rows = fetch_rows(
        """
        SELECT
            EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at_ms
        FROM stats
        WHERE user_id = %s
          AND question_id = %s
          AND practiced_at = to_timestamp(%s / 1000.0)
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        (user_id, question_id, round(practiced_at_ms)),
    )

    if not rows:
        return None

    return float(rows[0]["updated_at_ms"])


def query_setting(user_id, key):
    rows = fetch_rows(
        """
        SELECT value,
               EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at_ms
        FROM settings
        WHERE user_id = %s
          AND key = %s
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        (user_id, key),
    )

    return rows[0] if rows else None


def query_badge(user_id, badge_id):
    rows = fetch_rows(
        """
        SELECT
            unlocked_at,
            EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at_ms
        FROM user_badges
        WHERE user_id = %s
          AND badge_id = %s
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        (user_id, badge_id),
    )

    return rows[0] if rows else None


def query_setting_key(user_id, key):
    rows = fetch_rows(
        """
        SELECT value,
               EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at_ms
        FROM settings
        WHERE user_id = %s
          AND key = %s
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        (user_id, key),
    )

    return rows[0] if rows else None


def test_stats_upsert_ignores_stale_payload():
    user_id = 1
    question_id = "conflict_test"
    practiced_at = 1_700_000_000_000
    fresh_updated_at = practiced_at + 5000
    stale_updated_at = practiced_at - 5000

    payload = {
        "user_id": user_id,
        "reviews": [],
        "stats": [
            {
                "user_id": user_id,
                "question_id": question_id,
                "correct": 5,
                "wrong": 1,
                "practiced_at": practiced_at,
                "updated_at": fresh_updated_at,
            }
        ],
        "settings": [],
        "user_badges": [],
    }

    push_payload(payload)
    first_ts = query_stats_row(user_id, question_id, practiced_at)
    assert first_ts is not None

    payload["stats"][0]["updated_at"] = stale_updated_at
    payload["stats"][0]["correct"] = 999
    push_payload(payload)

    second_ts = query_stats_row(user_id, question_id, practiced_at)
    assert abs(second_ts - first_ts) < 1, "Stale update should not overwrite stats timestamp"


def test_settings_upsert_ignores_older_updates():
    user_id = 1
    key = "sync_conflict_setting"
    fresh_value = "fresh"
    stale_value = "stale"

    payload = {
        "user_id": user_id,
        "reviews": [],
        "stats": [],
        "settings": [
            {
                "user_id": user_id,
                "key": key,
                "value": fresh_value,
                "updated_at": current_millis(),
            }
        ],
        "user_badges": [],
    }

    push_payload(payload)
    first_entry = query_setting(user_id, key)
    assert first_entry is not None

    payload["settings"][0]["value"] = stale_value
    payload["settings"][0]["updated_at"] = float(first_entry["updated_at_ms"]) - 10_000
    push_payload(payload)

    second_entry = query_setting(user_id, key)
    assert second_entry["value"] == fresh_value


def test_user_badges_updates_respect_updated_at():
    user_id = 1
    badge_id = "conflict_badge"

    payload = {
        "user_id": user_id,
        "reviews": [],
        "stats": [],
        "settings": [],
        "user_badges": [
            {
                "user_id": user_id,
                "badge_id": badge_id,
                "unlocked_at": current_millis(),
                "updated_at": current_millis(),
            }
        ],
    }

    push_payload(payload)
    first_entry = query_badge(user_id, badge_id)
    assert first_entry is not None

    payload["user_badges"][0]["updated_at"] = float(
      first_entry["updated_at_ms"]
    ) - 10_000
    payload["user_badges"][0]["unlocked_at"] = (
      float(first_entry["unlocked_at"].timestamp() * 1000)
      - 1_000
    )
    push_payload(payload)

    second_entry = query_badge(user_id, badge_id)
    assert second_entry["updated_at_ms"] == first_entry["updated_at_ms"]


def pull_reviews(user_id: int, since: int = 0):
    wait_for_server()
    resp = requests.get(
        f"{BASE_URL}/reviews/pull?user_id={user_id}&since_rev_id={since}"
    )
    resp.raise_for_status()
    return resp.json()


def test_push_pull_roundtrip_includes_all_tables():
    user_id = 1
    question_id = "roundtrip_question"
    practiced_at = current_millis()
    badge_id = "roundtrip_badge"
    setting_key = "roundtrip_setting"

    payload = {
        "user_id": user_id,
        "reviews": [],
        "stats": [
            {
                "user_id": user_id,
                "question_id": question_id,
                "correct": 2,
                "wrong": 1,
                "practiced_at": practiced_at,
                "updated_at": practiced_at,
            }
        ],
        "settings": [
            {
                "user_id": user_id,
                "key": setting_key,
                "value": "roundtrip",
                "updated_at": practiced_at,
            }
        ],
        "user_badges": [
            {
                "user_id": user_id,
                "badge_id": badge_id,
                "unlocked_at": practiced_at,
                "updated_at": practiced_at,
            }
        ],
    }

    push_payload(payload)

    pulled = pull_reviews(user_id)

    assert any(
        stat["question_id"] == question_id
        for stat in pulled.get("stats", [])
    ), "Stats should appear in pull response"
    assert any(
        setting["key"] == setting_key
        for setting in pulled.get("settings", [])
    ), "Settings should appear in pull response"
    assert any(
        badge["badge_id"] == badge_id
        for badge in pulled.get("user_badges", [])
    ), "Badges should appear in pull response"


def test_settings_roundtrip_keeps_admin_snapshot_rows():
    user_id = 1
    subject_key = f"admin_visible_subject_ids_user_{user_id}"
    topic_key = f"admin_visible_topic_ids_user_{user_id}"
    timestamp = current_millis()

    payload = {
        "user_id": user_id,
        "reviews": [],
        "stats": [],
        "settings": [
            {
                "user_id": user_id,
                "key": subject_key,
                "value": "[1,2,3]",
                "updated_at": timestamp,
            },
            {
                "user_id": user_id,
                "key": topic_key,
                "value": "[4,5,6]",
                "updated_at": timestamp,
            },
        ],
        "user_badges": [],
    }

    push_payload(payload)

    subject_row = query_setting_key(user_id, subject_key)
    topic_row = query_setting_key(user_id, topic_key)

    assert subject_row is not None
    assert topic_row is not None
    assert subject_row["value"] == "[1,2,3]"
    assert topic_row["value"] == "[4,5,6]"
