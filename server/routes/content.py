from typing import Any

from fastapi import APIRouter

from db import fetch_rows

router = APIRouter(prefix="/content")


@router.get("/signature")
def content_signature() -> dict[str, Any]:
    row = (fetch_rows(
        """
        SELECT
            COUNT(*)::bigint AS question_count,
            COALESCE(MAX(id), 0)::bigint AS max_question_id
        FROM questions
        """
    ) or [{}])[0]

    question_count = int(row.get("question_count") or 0)
    max_question_id = int(row.get("max_question_id") or 0)
    signature = f"{question_count}:{max_question_id}"

    return {
        "question_count": question_count,
        "max_question_id": max_question_id,
        "signature": signature,
    }


@router.get("/questions")
def content_questions() -> dict[str, Any]:
    rows = fetch_rows(
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
