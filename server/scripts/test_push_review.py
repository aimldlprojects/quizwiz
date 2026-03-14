import requests
import sqlite3
import time
from pathlib import Path

BASE_URL = "http://localhost:8000"

DB_PATH = Path(__file__).resolve().parents[1] / "quizwiz.db"

payload = {
    "reviews": [
        {
            "rev": int(time.time()),
            "user_id": 1,
            "question_id": 1001,
            "repetition": 1,
            "interval": 1,
            "ease_factor": 2.5,
            "next_review": int(time.time()) + 3600,
            "last_result": "good"
        }
    ]
}

print("\nSending review to server...")

r = requests.post(f"{BASE_URL}/reviews/push", json=payload)

print("API Status:", r.status_code)
print("API Response:", r.text)

print("\nChecking database...")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT * FROM reviews WHERE question_id=1001")

row = cursor.fetchone()

conn.close()

if row:
    print("\nSUCCESS: Review inserted")
    print(row)
else:
    print("\nReview still not inserted")