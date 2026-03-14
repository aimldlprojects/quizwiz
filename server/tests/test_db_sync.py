import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "quizwiz.db"


def initialize_db():

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            question_id INTEGER,
            repetition INTEGER DEFAULT 0,
            interval INTEGER DEFAULT 0,
            ease_factor REAL DEFAULT 2.5,
            next_review INTEGER,
            last_result TEXT,
            UNIQUE(user_id, question_id)
        )
    """)

    conn.commit()
    conn.close()


def test_reviews_table_exists():

    initialize_db()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type='table' AND name='reviews'
    """)

    table = cursor.fetchone()

    conn.close()

    assert table is not None


def test_insert_review():

    initialize_db()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT OR IGNORE INTO reviews
        (user_id, question_id, repetition, interval, ease_factor, next_review, last_result)
        VALUES (1, 999, 1, 1, 2.5, 1710000000, 'good')
    """)

    conn.commit()

    cursor.execute(
        "SELECT * FROM reviews WHERE question_id=999"
    )

    row = cursor.fetchone()

    conn.close()

    assert row is not None