from typing import Any

from fastapi import APIRouter
from psycopg2.extras import RealDictCursor

from db import get_db

router = APIRouter(prefix="/content")


@router.get("/signature")
def content_signature() -> dict[str, Any]:
    conn = get_db()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*)::bigint AS question_count,
                    COALESCE(MAX(id), 0)::bigint AS max_question_id
                FROM questions
                """
            )
            row = cur.fetchone() or {}

        question_count = int(row.get("question_count") or 0)
        max_question_id = int(row.get("max_question_id") or 0)
        signature = f"{question_count}:{max_question_id}"

        return {
            "question_count": question_count,
            "max_question_id": max_question_id,
            "signature": signature,
        }
    finally:
        conn.close()


@router.get("/questions")
def content_questions() -> dict[str, Any]:
    conn = get_db()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    t.key AS topic_key,
                    q.type,
                    q.question,
                    q.answer
                FROM questions q
                INNER JOIN topics t
                    ON t.id = q.topic_id
                WHERE t.key IS NOT NULL
                ORDER BY t.key ASC, q.id ASC
                """
            )
            rows = cur.fetchall() or []

        questions = [
            {
                "topic_key": row.get("topic_key"),
                "type": row.get("type"),
                "question": row.get("question"),
                "answer": row.get("answer"),
            }
            for row in rows
            if row.get("topic_key") and row.get("question") and row.get("answer")
        ]

        return {
            "count": len(questions),
            "questions": questions,
        }
    finally:
        conn.close()

