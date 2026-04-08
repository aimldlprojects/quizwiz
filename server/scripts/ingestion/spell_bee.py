import csv
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure the repository root is on sys.path so
# `from server import ...` works when this script is run directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from server import db as server_db
from server.config.app_config import BACKUP_DIR

SCRIPT_DIR = Path(__file__).resolve().parent
CSV_PATH = SCRIPT_DIR / "word_list_all.csv"

SPELL_BEE_TOPIC_KEYS_BY_LENGTH = {
    2: "two_letter_words",
    3: "three_letter_words",
    4: "four_letter_words",
    5: "five_letter_words",
    6: "six_letter_words",
    7: "seven_letter_words",
}

SCIENCE_TOPIC_KEY_BY_LENGTH = {
    "short": "science_short_words",
    "long": "science_long_words",
}

ENGLISH_WORD_TYPES = {
    "sight words",
    "1k_most_used",
}

SCIENCE_WORD_TYPES = {
    "6_science_sem1",
    "3_science_ls1",
    "3_science_ls2",
}

SCIENCE_SHORT_MAX_LENGTH = 5
PROGRESS_LOG_EVERY = 200


def backup_master_db():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    config = server_db.get_db_config()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%SZ")
    destination = BACKUP_DIR / f"master_backup_{timestamp}.sql"

    pg_dump = shutil.which("pg_dump")
    if not pg_dump:
        raise FileNotFoundError(
            "pg_dump not found in PATH. Install PostgreSQL client tools first."
        )

    env = os.environ.copy()
    if config.get("password"):
        env["PGPASSWORD"] = config["password"]

    cmd = [
        pg_dump,
        "-h",
        config["host"],
        "-p",
        str(config["port"]),
        "-U",
        config["user"],
        "-f",
        str(destination),
        config["database"],
    ]

    result = subprocess.run(
        cmd,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            "Backup failed before Spell Bee ingestion: "
            f"{result.stderr.strip() or result.stdout.strip() or 'unknown error'}"
        )

    print("Master backup written to", destination)


def fetch_spell_bee_topic_ids(cursor):
    keys = [
        *SPELL_BEE_TOPIC_KEYS_BY_LENGTH.values(),
        *SCIENCE_TOPIC_KEY_BY_LENGTH.values(),
    ]
    cursor.execute(
        """
        SELECT key, id
        FROM topics
        WHERE key = ANY(%s)
        """,
        (keys,),
    )
    rows = cursor.fetchall()
    return {key: topic_id for key, topic_id in rows}


def resolve_target_topic(topic_ids_by_key, word, word_type):
    normalized_word_type = (word_type or "").strip().lower()
    word_length = len(word)

    if normalized_word_type in ENGLISH_WORD_TYPES:
        topic_key = SPELL_BEE_TOPIC_KEYS_BY_LENGTH.get(word_length)
        if not topic_key:
            return None, None
        return topic_ids_by_key.get(topic_key), "english-spell-bee"

    if normalized_word_type in SCIENCE_WORD_TYPES:
        topic_key = (
            SCIENCE_TOPIC_KEY_BY_LENGTH["short"]
            if word_length <= SCIENCE_SHORT_MAX_LENGTH
            else SCIENCE_TOPIC_KEY_BY_LENGTH["long"]
        )
        return topic_ids_by_key.get(topic_key), "science-spelling"

    return None, None


def ingest_spellbee_data():
    print("Starting Spell Bee ingestion...")
    backup_master_db()
    print("Backup completed. Starting row ingestion...")

    conn = server_db.get_db()
    cursor = conn.cursor()
    processed = 0
    inserted = 0
    updated = 0
    skipped = 0
    skipped_unknown_word_type = 0
    skipped_missing_topic = 0
    skipped_bad_row = 0

    try:
        topic_ids_by_key = fetch_spell_bee_topic_ids(cursor)

        with open(CSV_PATH, newline="", encoding="utf-8") as file:
            reader = csv.DictReader(file)

            for row in reader:
                processed += 1
                word = (row.get("word") or "").strip()
                sentence = (row.get("openai_sentence") or "").strip()
                word_type = (row.get("word_type") or "").strip()

                if not word or not sentence:
                    skipped += 1
                    skipped_bad_row += 1
                    continue

                topic_id, question_type = resolve_target_topic(
                    topic_ids_by_key,
                    word,
                    word_type,
                )
                if not topic_id or not question_type:
                    skipped += 1
                    if word_type.strip().lower() in (
                        ENGLISH_WORD_TYPES | SCIENCE_WORD_TYPES
                    ):
                        skipped_missing_topic += 1
                    else:
                        skipped_unknown_word_type += 1
                    continue

                cursor.execute(
                    """
                    INSERT INTO questions (topic_id, type, question, answer)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (topic_id, question)
                    DO UPDATE SET
                      type = EXCLUDED.type,
                      answer = EXCLUDED.answer
                    RETURNING (xmax = 0) AS inserted
                    """,
                    (topic_id, question_type, sentence, word),
                )

                was_inserted = cursor.fetchone()[0]
                if was_inserted:
                    inserted += 1
                else:
                    updated += 1

                if processed % PROGRESS_LOG_EVERY == 0:
                    print(
                        "Ingestion progress:",
                        {
                            "processed": processed,
                            "inserted": inserted,
                            "updated": updated,
                            "skipped": skipped,
                            "last_word": word,
                            "last_word_type": word_type,
                        },
                    )

        conn.commit()
        print(
            "Spell Bee ingestion completed:",
            {
                "processed": processed,
                "inserted": inserted,
                "updated": updated,
                "skipped": skipped,
                "skipped_bad_row": skipped_bad_row,
                "skipped_unknown_word_type": skipped_unknown_word_type,
                "skipped_missing_topic": skipped_missing_topic,
            },
        )
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    ingest_spellbee_data()
