#!/usr/bin/env python
"""
Restore user-state tables from a Postgres master backup after a reset.

This script restores only the tables that hold user progress and sync state:

- badges
- user_badges
- sync_meta
- settings
- reviews
- stats

It does not touch questions, topics, subjects, or users.

Question and topic ids are remapped against the current database by matching
the backup's catalog entries to the current catalog entries using the question
content and topic key. That keeps table practice history and other subject
progress aligned with the new seeded ids.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any

# Ensure the repository root is on sys.path so this script can be run directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values

from server import db as server_db
from server.config.app_config import BACKUP_DIR

TARGET_TABLES = [
    "badges",
    "user_badges",
    "sync_meta",
    "settings",
    "reviews",
    "stats",
]

QUESTION_ID_KEYS = {
    "cardId",
    "id",
    "questionId",
    "question_id",
    "questionIds",
    "question_ids",
    "seenIds",
    "seen_ids",
}

TOPIC_ID_KEYS = {
    "parentTopicId",
    "parent_topic_id",
    "topicId",
    "topic_id",
    "topicIds",
    "topic_ids",
}


def run_subprocess(cmd, env=None):
    print("Running:", " ".join(cmd))
    result = subprocess.run(cmd, env=env)
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed with exit code {result.returncode}: {' '.join(cmd)}"
        )


def get_admin_config():
    config = server_db.get_db_config()
    return {
        "host": config["host"],
        "port": config["port"],
        "user": config["user"],
        "password": config["password"],
        "database": "postgres",
    }


def get_backup_path(raw_path: str | None) -> Path:
    if raw_path:
        backup_path = Path(raw_path).expanduser().resolve()
    else:
        candidates = sorted(
            BACKUP_DIR.glob("master_backup_*.sql"),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        if not candidates:
            raise FileNotFoundError(
                "No master backup files were found in the backups directory."
            )
        backup_path = candidates[0]

    if not backup_path.exists():
        raise FileNotFoundError(f"Backup file not found: {backup_path}")

    return backup_path


def create_database(admin_config, database_name: str):
    conn = psycopg2.connect(**admin_config)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL("CREATE DATABASE {}").format(
                    sql.Identifier(database_name)
                )
            )
    finally:
        conn.close()


def drop_database(admin_config, database_name: str):
    conn = psycopg2.connect(**admin_config)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = %s
                  AND pid <> pg_backend_pid()
                """,
                (database_name,),
            )
            cur.execute(
                sql.SQL("DROP DATABASE IF EXISTS {}").format(
                    sql.Identifier(database_name)
                )
            )
    finally:
        conn.close()


def restore_dump_into_database(backup_path: Path, config: dict[str, Any], database_name: str):
    psql = shutil.which("psql")
    if not psql:
        raise FileNotFoundError(
            "psql not found in PATH. Please install PostgreSQL tools or add psql to PATH."
        )

    env = os.environ.copy()
    if config.get("password"):
        env["PGPASSWORD"] = config["password"]

    cmd = [
        psql,
        "-h",
        config["host"],
        "-p",
        str(config["port"]),
        "-U",
        config["user"],
        "-d",
        database_name,
        "-v",
        "ON_ERROR_STOP=1",
        "-f",
        str(backup_path),
    ]
    run_subprocess(cmd, env)


def get_table_columns(cur, table_name: str) -> list[str]:
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table_name,),
    )
    return [row[0] for row in cur.fetchall()]


def fetch_table_rows(cur, table_name: str, columns: list[str]):
    if not columns:
        return []

    query = sql.SQL("SELECT {} FROM {}").format(
        sql.SQL(", ").join(sql.Identifier(column) for column in columns),
        sql.Identifier(table_name),
    )
    cur.execute(query)
    return cur.fetchall()


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    return " ".join(value.split()).strip()


def fingerprint_question(row: tuple[Any, ...], columns: list[str]) -> tuple[str, str, str, str]:
    column_index = {column: idx for idx, column in enumerate(columns)}
    return (
        normalize_text(row[column_index["type"]]),
        normalize_text(row[column_index["topic_key"]]),
        normalize_text(row[column_index["question"]]),
        normalize_text(row[column_index["answer"]]),
    )


def load_question_catalog(cur) -> dict[str, dict[str, Any]]:
    cur.execute(
        """
        SELECT q.id, q.type, t.key AS topic_key, q.question, q.answer
        FROM questions q
        JOIN topics t ON t.id = q.topic_id
        """
    )
    rows = cur.fetchall()
    columns = ["id", "type", "topic_key", "question", "answer"]
    catalog = {}
    for row in rows:
        catalog[fingerprint_question(row, columns)] = {
            "id": row[0],
            "type": row[1],
            "topic_key": row[2],
            "question": row[3],
            "answer": row[4],
        }
    return catalog


def load_topic_catalog(cur) -> dict[str, int]:
    cur.execute(
        """
        SELECT id, key
        FROM topics
        """
    )
    return {row[1]: row[0] for row in cur.fetchall()}


def build_question_id_map(backup_cur, current_cur) -> dict[int, int]:
    backup_cur.execute(
        """
        SELECT q.id, q.type, t.key AS topic_key, q.question, q.answer
        FROM questions q
        JOIN topics t ON t.id = q.topic_id
        """
    )
    backup_rows = backup_cur.fetchall()
    backup_columns = ["id", "type", "topic_key", "question", "answer"]
    current_catalog = load_question_catalog(current_cur)
    current_family_index: dict[tuple[str, str, str], list[dict[str, Any]]] = {}

    for entry in current_catalog.values():
        family_key = (
            normalize_text(entry["type"]),
            normalize_text(entry["topic_key"]),
            normalize_text(entry["answer"]),
        )
        current_family_index.setdefault(family_key, []).append(entry)

    question_id_map: dict[int, int] = {}
    missing = []

    for row in backup_rows:
        fingerprint = fingerprint_question(row, backup_columns)
        current_entry = current_catalog.get(fingerprint)
        if current_entry is None:
            family_key = (
                normalize_text(row[1]),
                normalize_text(row[2]),
                normalize_text(row[4]),
            )
            family_candidates = current_family_index.get(family_key, [])
            if len(family_candidates) == 1:
                current_entry = family_candidates[0]
            elif family_candidates:
                answer_text = normalize_text(row[4]).lower()
                containing_answer = [
                    candidate
                    for candidate in family_candidates
                    if answer_text and answer_text in normalize_text(candidate["question"]).lower()
                ]
                if len(containing_answer) == 1:
                    current_entry = containing_answer[0]
                elif containing_answer:
                    current_entry = min(
                        containing_answer,
                        key=lambda candidate: len(normalize_text(candidate["question"])),
                    )

        if current_entry is None:
            missing.append(
                {
                    "legacy_id": row[0],
                    "type": row[1],
                    "topic_key": row[2],
                    "question": row[3],
                }
            )
            continue
        question_id_map[int(row[0])] = int(current_entry["id"])

    if missing:
        print(
            f"Warning: {len(missing)} backup question(s) could not be matched to the current catalog."
        )
        preview = missing[:5]
        for item in preview:
            print(
                "  Unmatched question:",
                item["legacy_id"],
                item["topic_key"],
                item["type"],
                item["question"],
            )

    return question_id_map


def build_topic_id_map(backup_cur, current_cur) -> dict[int, int]:
    backup_cur.execute(
        """
        SELECT id, key
        FROM topics
        """
    )
    backup_rows = backup_cur.fetchall()
    current_topic_map = load_topic_catalog(current_cur)

    topic_id_map: dict[int, int] = {}
    missing = []

    for old_id, topic_key in backup_rows:
        new_id = current_topic_map.get(topic_key)
        if new_id is None:
            missing.append((old_id, topic_key))
            continue
        topic_id_map[int(old_id)] = int(new_id)

    if missing:
        print(
            f"Warning: {len(missing)} backup topic(s) could not be matched to the current catalog."
        )
        for old_id, topic_key in missing[:5]:
            print("  Unmatched topic:", old_id, topic_key)

    return topic_id_map


def remap_id_value(value: Any, id_map: dict[int, int]):
    if isinstance(value, int):
        return id_map.get(value, value)

    if isinstance(value, str) and value.isdigit():
        mapped = id_map.get(int(value))
        if mapped is None:
            return value
        return str(mapped)

    return value


def remap_id_value_or_none(value: Any, id_map: dict[int, int]):
    if isinstance(value, int):
        mapped = id_map.get(value)
        return mapped

    if isinstance(value, str) and value.isdigit():
        mapped = id_map.get(int(value))
        if mapped is None:
            return None
        return str(mapped)

    return None


def remap_json_value(value: Any, question_id_map: dict[int, int], topic_id_map: dict[int, int], key: str | None = None):
    if isinstance(value, dict):
        remapped = {}
        for child_key, child_value in value.items():
            remapped[child_key] = remap_json_value(
                child_value,
                question_id_map,
                topic_id_map,
                child_key,
            )
        return remapped

    if isinstance(value, list):
        if key in QUESTION_ID_KEYS:
            return [remap_id_value(item, question_id_map) for item in value]
        if key in TOPIC_ID_KEYS:
            return [remap_id_value(item, topic_id_map) for item in value]
        return [
            remap_json_value(item, question_id_map, topic_id_map)
            for item in value
        ]

    if key in QUESTION_ID_KEYS:
        return remap_id_value(value, question_id_map)

    if key in TOPIC_ID_KEYS:
        return remap_id_value(value, topic_id_map)

    return value


def parse_settings_value(value: Any, question_id_map: dict[int, int], topic_id_map: dict[int, int]):
    if value in (None, ""):
        return value

    try:
        parsed = json.loads(value)
    except Exception:
        return value

    remapped = remap_json_value(parsed, question_id_map, topic_id_map)
    return json.dumps(remapped)


def truncate_target_tables(cur):
    cur.execute(
        """
        TRUNCATE TABLE reviews, stats, settings, user_badges, badges, sync_meta
        RESTART IDENTITY CASCADE
        """
    )


def insert_rows(cur, table_name: str, columns: list[str], rows: list[tuple[Any, ...]]):
    if not rows:
        return

    column_sql = ", ".join(columns)
    query = f"INSERT INTO {table_name} ({column_sql}) VALUES %s"
    execute_values(cur, query, rows, page_size=1000)


def restore_state_tables(backup_path: Path):
    admin_config = get_admin_config()
    temp_db_name = f"quizwiz_restore_{uuid.uuid4().hex[:12]}"

    create_database(admin_config, temp_db_name)
    try:
        restore_dump_into_database(backup_path, admin_config, temp_db_name)

        current_config = server_db.get_db_config()
        temp_config = dict(current_config)
        temp_config["database"] = temp_db_name

        with psycopg2.connect(**current_config) as current_conn, psycopg2.connect(**temp_config) as backup_conn:
            with current_conn.cursor() as current_cur, backup_conn.cursor() as backup_cur:
                backup_cur.execute(
                    """
                    SELECT q.id, q.type, t.key AS topic_key, q.question, q.answer
                    FROM questions q
                    JOIN topics t ON t.id = q.topic_id
                    """
                )
                backup_question_lookup = {
                    int(row[0]): {
                        "id": int(row[0]),
                        "type": row[1],
                        "topic_key": row[2],
                        "question": row[3],
                        "answer": row[4],
                    }
                    for row in backup_cur.fetchall()
                }

                question_id_map = build_question_id_map(backup_cur, current_cur)
                topic_id_map = build_topic_id_map(backup_cur, current_cur)

                target_columns = {
                    table: get_table_columns(current_cur, table)
                    for table in TARGET_TABLES
                }

                backup_rows = {
                    table: fetch_table_rows(backup_cur, table, target_columns[table])
                    for table in TARGET_TABLES
                }

                truncate_target_tables(current_cur)

                insert_rows(
                    current_cur,
                    "badges",
                    target_columns["badges"],
                    backup_rows["badges"],
                )

                insert_rows(
                    current_cur,
                    "sync_meta",
                    target_columns["sync_meta"],
                    backup_rows["sync_meta"],
                )

                settings_columns = target_columns["settings"]
                settings_rows = []
                settings_index = {column: idx for idx, column in enumerate(settings_columns)}
                for row in backup_rows["settings"]:
                    row = list(row)
                    value_index = settings_index.get("value")
                    if value_index is not None:
                        row[value_index] = parse_settings_value(
                            row[value_index],
                            question_id_map,
                            topic_id_map,
                        )
                    settings_rows.append(tuple(row))

                insert_rows(
                    current_cur,
                    "settings",
                    settings_columns,
                    settings_rows,
                )

                reviews_columns = target_columns["reviews"]
                reviews_index = {column: idx for idx, column in enumerate(reviews_columns)}
                reviews_rows = []
                skipped_reviews = 0
                skipped_review_ids = []
                for row in backup_rows["reviews"]:
                    row = list(row)
                    question_index = reviews_index.get("question_id")
                    if question_index is None:
                        continue
                    mapped_question_id = remap_id_value_or_none(
                        row[question_index],
                        question_id_map,
                    )
                    if mapped_question_id is None:
                        skipped_reviews += 1
                        skipped_review_ids.append(row[question_index])
                        continue
                    row[question_index] = mapped_question_id
                    reviews_rows.append(tuple(row))

                insert_rows(
                    current_cur,
                    "reviews",
                    reviews_columns,
                    reviews_rows,
                )

                stats_columns = target_columns["stats"]
                stats_index = {column: idx for idx, column in enumerate(stats_columns)}
                stats_rows = []
                skipped_stats = 0
                skipped_stat_ids = []
                for row in backup_rows["stats"]:
                    row = list(row)
                    question_index = stats_index.get("question_id")
                    topic_index = stats_index.get("topic_id")
                    if question_index is not None:
                        mapped_question_id = remap_id_value_or_none(
                            row[question_index],
                            question_id_map,
                        )
                        if mapped_question_id is None:
                            skipped_stats += 1
                            skipped_stat_ids.append(row[question_index])
                            continue
                        row[question_index] = mapped_question_id
                    if topic_index is not None and row[topic_index] is not None:
                        mapped_topic_id = remap_id_value_or_none(
                            row[topic_index],
                            topic_id_map,
                        )
                        if mapped_topic_id is not None:
                            row[topic_index] = mapped_topic_id
                    stats_rows.append(tuple(row))

                insert_rows(
                    current_cur,
                    "stats",
                    stats_columns,
                    stats_rows,
                )

                if stats_rows and "id" in stats_columns:
                    current_cur.execute(
                        """
                        SELECT setval(
                            pg_get_serial_sequence('stats', 'id'),
                            COALESCE((SELECT MAX(id) FROM stats), 0),
                            true
                        )
                        """
                    )

                insert_rows(
                    current_cur,
                    "user_badges",
                    target_columns["user_badges"],
                    backup_rows["user_badges"],
                )

                current_conn.commit()

                print("Restored rows:")
                for table in TARGET_TABLES:
                    print(f"  {table}: {len(backup_rows[table])}")
                if skipped_reviews:
                    print(f"Skipped {skipped_reviews} review row(s) that could not be remapped.")
                    for skipped_id in sorted(set(skipped_review_ids))[:5]:
                        print("  Review legacy question_id:", repr(skipped_id))
                        details = backup_question_lookup.get(int(skipped_id)) if str(skipped_id).isdigit() else None
                        if details:
                            print(
                                "  Review id",
                                skipped_id,
                                "=>",
                                details["topic_key"],
                                details["type"],
                                details["question"],
                                "| answer:",
                                details["answer"],
                            )
                if skipped_stats:
                    print(f"Skipped {skipped_stats} stat row(s) that could not be remapped.")
                    for skipped_id in sorted(set(skipped_stat_ids))[:5]:
                        print("  Stat legacy question_id:", repr(skipped_id))
                        details = backup_question_lookup.get(int(skipped_id)) if str(skipped_id).isdigit() else None
                        if details:
                            print(
                                "  Stat id",
                                skipped_id,
                                "=>",
                                details["topic_key"],
                                details["type"],
                                details["question"],
                                "| answer:",
                                details["answer"],
                            )
    finally:
        drop_database(admin_config, temp_db_name)


def main():
    parser = argparse.ArgumentParser(
        description="Restore user-state tables from a master Postgres backup."
    )
    parser.add_argument(
        "backup_path",
        nargs="?",
        help="Path to the master_backup_*.sql file. Defaults to the newest backup in backups/.",
    )
    args = parser.parse_args()

    backup_path = get_backup_path(args.backup_path)
    print("Using backup:", backup_path)
    restore_state_tables(backup_path)


if __name__ == "__main__":
    main()
