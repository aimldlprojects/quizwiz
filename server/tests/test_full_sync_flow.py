import requests
import sqlite3
import time
from pathlib import Path


BASE_URL = "http://localhost:8000"

DB_PATH = Path(__file__).resolve().parents[1] / "quizwiz.db"


def wait_for_server(timeout=10):
    """
    Wait until FastAPI server becomes available
    """

    start = time.time()

    while time.time() - start < timeout:
        try:
            r = requests.get(f"{BASE_URL}/docs")

            if r.status_code == 200:
                return True
        except Exception:
            pass

        time.sleep(1)

    return False


def get_review_from_db(question_id):

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM reviews WHERE question_id=?",
        (question_id,)
    )

    row = cursor.fetchone()

    conn.close()

    return row


def test_full_sync_flow():

    """
    End-to-end test
    API → DB verification
    """

    assert wait_for_server(), "FastAPI server is not running"

    test_question_id = 55555

    payload = {
        "user_id": 1,
        "reviews": [
            {
                "question_id": test_question_id,
                "repetition": 1,
                "interval": 1,
                "ease_factor": 2.5,
                "next_review": 1710000000,
                "last_result": "good"
            }
        ]
    }

    response = requests.post(f"{BASE_URL}/sync", json=payload)

    print("Sync response:", response.text)

    assert response.status_code == 200

    time.sleep(1)

    db_row = get_review_from_db(test_question_id)

    print("DB Row:", db_row)

    assert db_row is not None