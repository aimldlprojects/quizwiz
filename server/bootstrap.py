from pathlib import Path
import sys

import psycopg2
from psycopg2 import sql
from psycopg2.extensions import (
    ISOLATION_LEVEL_AUTOCOMMIT,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from db import get_db_config
from server.config.app_config import (
    SYNC_DROP_BEFORE_BOOTSTRAP,
    SYNC_RESET_TABLES,
    DEFAULT_CURRICULUM_SUBJECTS
)


SUBJECTS = [
    "Mathematics",
    "English",
    "Science",
]

TOPICS = [
    {
        "key": "multiplication_tables",
        "name": "Multiplication Tables",
        "subject": "Mathematics",
        "parent": None,
    },
    {
        "key": "tables_1_5",
        "name": "Tables 1-5",
        "subject": "Mathematics",
        "parent": "multiplication_tables",
    },
    {
        "key": "tables_6_10",
        "name": "Tables 6-10",
        "subject": "Mathematics",
        "parent": "multiplication_tables",
    },
    {
        "key": "tables_11_15",
        "name": "Tables 11-15",
        "subject": "Mathematics",
        "parent": "multiplication_tables",
    },
    {
        "key": "tables_16_20",
        "name": "Tables 16-20",
        "subject": "Mathematics",
        "parent": "multiplication_tables",
    },
    {
        "key": "addition",
        "name": "Addition",
        "subject": "Mathematics",
        "parent": None,
    },
    {
        "key": "subtraction",
        "name": "Subtraction",
        "subject": "Mathematics",
        "parent": None,
    },
    {
        "key": "division",
        "name": "Division",
        "subject": "Mathematics",
        "parent": None,
    },
    {
        "key": "fractions",
        "name": "Fractions",
        "subject": "Mathematics",
        "parent": None,
    },
    {
        "key": "word_problems",
        "name": "Word Problems",
        "subject": "Mathematics",
        "parent": None,
    },
    {
        "key": "word_spellings",
        "name": "Word Spellings",
        "subject": "English",
        "parent": None,
    },
    {
        "key": "two_letter_words",
        "name": "2 Letter Words",
        "subject": "English",
        "parent": "word_spellings",
    },
    {
        "key": "three_letter_words",
        "name": "3 Letter Words",
        "subject": "English",
        "parent": "word_spellings",
    },
    {
        "key": "four_letter_words",
        "name": "4 Letter Words",
        "subject": "English",
        "parent": "word_spellings",
    },
    {
        "key": "five_letter_words",
        "name": "5 Letter Words",
        "subject": "English",
        "parent": "word_spellings",
    },
    {
        "key": "six_letter_words",
        "name": "6 Letter Words",
        "subject": "English",
        "parent": "word_spellings",
    },
    {
        "key": "seven_letter_words",
        "name": "7 Letter Words",
        "subject": "English",
        "parent": "word_spellings",
    },
    {
        "key": "jumbled_words",
        "name": "Jumbled Words",
        "subject": "English",
        "parent": None,
    },
    {
        "key": "jumble_three_letter",
        "name": "3 Letter Jumble",
        "subject": "English",
        "parent": "jumbled_words",
    },
    {
        "key": "jumble_five_letter",
        "name": "5 Letter Jumble",
        "subject": "English",
        "parent": "jumbled_words",
    },
    {
        "key": "science_spellings",
        "name": "Science Spellings",
        "subject": "Science",
        "parent": None,
    },
    {
        "key": "science_short_words",
        "name": "Science Short Words",
        "subject": "Science",
        "parent": "science_spellings",
    },
    {
        "key": "science_long_words",
        "name": "Science Long Words",
        "subject": "Science",
        "parent": "science_spellings",
    },
]

QUESTIONS = [
    (
        "addition",
        "math-addition",
        "4 + 3 = ?",
        "7",
    ),
    (
        "addition",
        "math-addition",
        "9 + 6 = ?",
        "15",
    ),
    (
        "subtraction",
        "math-subtraction",
        "12 - 5 = ?",
        "7",
    ),
    (
        "subtraction",
        "math-subtraction",
        "18 - 9 = ?",
        "9",
    ),
    (
        "division",
        "math-division",
        "24 / 6 = ?",
        "4",
    ),
    (
        "division",
        "math-division",
        "35 / 5 = ?",
        "7",
    ),
    (
        "fractions",
        "fractions",
        "What fraction of 8 slices is 4 slices?",
        "1/2",
    ),
    (
        "fractions",
        "fractions",
        "What fraction of 10 stars is 5 stars?",
        "1/2",
    ),
    (
        "word_problems",
        "word-problem",
        "Ria has 3 apples and gets 4 more. How many apples now?",
        "7",
    ),
    (
        "word_problems",
        "word-problem",
        "There are 12 birds and 5 fly away. How many are left?",
        "7",
    ),
    (
        "two_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: I am __ school.",
        "at",
    ),
    (
        "two_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: We go __ home.",
        "to",
    ),
    (
        "three_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: The cat sat on the m_t.",
        "mat",
    ),
    (
        "three_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: The sun is h_t.",
        "hot",
    ),
    (
        "four_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: The fish can s__m fast.",
        "swim",
    ),
    (
        "four_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: We read a b__k.",
        "book",
    ),
    (
        "five_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: I like to r__d books.",
        "read",
    ),
    (
        "five_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: We plant a s__ed in soil.",
        "seed",
    ),
    (
        "six_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: The bright p__ple flower smells nice.",
        "purple",
    ),
    (
        "six_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: We saw a r__bit in the garden.",
        "rabbit",
    ),
    (
        "seven_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: The r__nbow has many colors.",
        "rainbow",
    ),
    (
        "seven_letter_words",
        "spelling-fill-blank",
        "Fill in the blank: A g__affe has a long neck.",
        "giraffe",
    ),
    (
        "jumble_three_letter",
        "jumble-word",
        "Unscramble the word: tac",
        "cat",
    ),
    (
        "jumble_three_letter",
        "jumble-word",
        "Unscramble the word: god",
        "dog",
    ),
    (
        "jumble_five_letter",
        "jumble-word",
        "Unscramble the word: leapp",
        "apple",
    ),
    (
        "jumble_five_letter",
        "jumble-word",
        "Unscramble the word: girte",
        "tiger",
    ),
    (
        "science_short_words",
        "science-spelling",
        "Fill in the blank: Plants need a_r.",
        "air",
    ),
    (
        "science_short_words",
        "science-spelling",
        "Fill in the blank: The sun gives us h__.",
        "heat",
    ),
    (
        "science_long_words",
        "science-spelling",
        "Fill in the blank: A p__net moves around the sun.",
        "planet",
    ),
    (
        "science_long_words",
        "science-spelling",
        "Fill in the blank: A r__ket flies into space.",
        "rocket",
    ),
]


def ensure_database_exists(config):

    admin_config = {
        "host": config["host"],
        "user": config["user"],
        "password": config["password"],
        "port": config["port"],
        "database": "postgres",
    }

    conn = psycopg2.connect(**admin_config)
    conn.set_isolation_level(
        ISOLATION_LEVEL_AUTOCOMMIT
    )

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM pg_database
                WHERE datname = %s
                """,
                (config["database"],),
            )

            exists = cur.fetchone() is not None

            if not exists:
                cur.execute(
                    sql.SQL(
                        "CREATE DATABASE {}"
                    ).format(
                        sql.Identifier(
                            config["database"]
                        )
                    )
                )
                print(
                    f"Created database '{config['database']}'."
                )
            else:
                print(
                    f"Database '{config['database']}' already exists."
                )
    finally:
        conn.close()


def clean_database(conn):

    if not SYNC_DROP_BEFORE_BOOTSTRAP:
        return

    with conn.cursor() as cur:
        print(
            "Dropping existing tables:",
            ", ".join(SYNC_RESET_TABLES)
        )
        for table in SYNC_RESET_TABLES:
            cur.execute(
                sql.SQL("DROP TABLE IF EXISTS {} CASCADE").format(
                    sql.Identifier(table)
                )
            )

    conn.commit()


def apply_schema(config):

    schema_path = (
        Path(__file__).parent
        / "database"
        / "schema.sql"
    )

    if not schema_path.exists():
        raise FileNotFoundError(
            f"Schema file not found: {schema_path}"
        )

    schema_sql = schema_path.read_text(
        encoding="utf-8"
    )

    conn = psycopg2.connect(**config)

    try:
        clean_database(conn)

        with conn.cursor() as cur:
            cur.execute(schema_sql)
            migrate_reviews_table(cur)
            migrate_topics_table(cur)
            migrate_stats_table(cur)
            migrate_settings_table(cur)
            migrate_user_badges_table(cur)
            ensure_sync_meta_table(cur)
            seed_demo_content(cur)
            ensure_initial_review(cur)

        conn.commit()
        print(
            f"Applied schema from '{schema_path.name}'."
        )
    finally:
        conn.close()


def migrate_reviews_table(cur):

    cur.execute(
        """
        ALTER TABLE reviews
        ALTER COLUMN user_id TYPE BIGINT,
        ALTER COLUMN question_id TYPE TEXT,
        ALTER COLUMN rev_id TYPE BIGINT,
        ALTER COLUMN next_review TYPE BIGINT
        """
    )


def migrate_topics_table(cur):

    cur.execute(
        """
        ALTER TABLE topics
        ADD COLUMN IF NOT EXISTS parent_topic_id BIGINT
        """
    )
    cur.execute(
        """
        ALTER TABLE topics
        ADD COLUMN IF NOT EXISTS key TEXT
        """
    )
    cur.execute(
        """
        ALTER TABLE questions
        ADD COLUMN IF NOT EXISTS type TEXT
        """
    )


def migrate_stats_table(cur):

    cur.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'stats'
                AND column_name = 'created_at'
            ) THEN
                ALTER TABLE stats
                RENAME COLUMN created_at TO practiced_at;
            END IF;
        END
        $$;
        """
    )

    cur.execute(
        """
        ALTER TABLE stats
        ADD COLUMN IF NOT EXISTS question_id TEXT
        """
    )

    cur.execute(
        """
        ALTER TABLE stats
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
        """
    )

    cur.execute(
        """
        ALTER TABLE stats
        ALTER COLUMN practiced_at SET DEFAULT NOW()
        """
    )

    cur.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'stats_user_question_practiced_unique'
            ) THEN
                ALTER TABLE stats
                ADD CONSTRAINT stats_user_question_practiced_unique
                UNIQUE (user_id, question_id, practiced_at);
            END IF;
        END
        $$;
        """
    )


def migrate_settings_table(cur):

    cur.execute(
        """
        ALTER TABLE settings
        ADD COLUMN IF NOT EXISTS user_id BIGINT NOT NULL DEFAULT 0
        """
    )

    cur.execute(
        """
        ALTER TABLE settings
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
        """
    )

    cur.execute(
        """
        ALTER TABLE settings
        ADD COLUMN IF NOT EXISTS sync_version BIGINT DEFAULT 1
        """
    )

    cur.execute(
        """
        UPDATE settings
        SET sync_version = 1
        WHERE sync_version IS NULL
        """
    )

    cur.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conrelid = 'public.settings'::regclass
                AND contype = 'p'
            ) THEN
                ALTER TABLE settings
                ADD CONSTRAINT settings_user_key_pk
                PRIMARY KEY (user_id, key);
            END IF;
        END
        $$;
        """
    )


def migrate_user_badges_table(cur):

    cur.execute(
        """
        ALTER TABLE user_badges
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
        """
    )

    cur.execute(
        """
        ALTER TABLE user_badges
        ADD COLUMN IF NOT EXISTS sync_version BIGINT DEFAULT 1
        """
    )

    cur.execute(
        """
        UPDATE user_badges
        SET sync_version = 1
        WHERE sync_version IS NULL
        """
    )


def ensure_sync_meta_table(cur):

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS sync_meta (

            user_id BIGINT PRIMARY KEY,
            last_push_rev_id BIGINT,
            last_pull_rev_id BIGINT,
            last_sync_time BIGINT,
            sync_status TEXT,
            error_message TEXT,
            last_push TIMESTAMP,
            last_pull TIMESTAMP,
            last_error TEXT,
            updated_at TIMESTAMP DEFAULT NOW()

        )
        """
    )

    cur.execute(
        """
        ALTER TABLE sync_meta
        ADD COLUMN IF NOT EXISTS last_push TIMESTAMP
        """
    )

    cur.execute(
        """
        ALTER TABLE sync_meta
        ADD COLUMN IF NOT EXISTS last_pull TIMESTAMP
        """
    )

    cur.execute(
        """
        ALTER TABLE sync_meta
        ADD COLUMN IF NOT EXISTS last_error TEXT
        """
    )

    cur.execute(
        """
        ALTER TABLE sync_meta
        ADD COLUMN IF NOT EXISTS error_message TEXT
        """
    )


def seed_demo_content(cur):

    user_ids = {}

    for user_name in [
        "Bhavi",
        "Madhu",
        "Quiz Kid",
    ]:
        cur.execute(
            """
            SELECT id
            FROM users
            WHERE name = %s
            LIMIT 1
            """,
            (user_name,),
        )

        row = cur.fetchone()

        if row:
            user_ids[user_name] = row[0]
            continue

        cur.execute(
            """
            INSERT INTO users(name)
            VALUES (%s)
            RETURNING id
            """,
            (user_name,),
        )
        user_ids[user_name] = cur.fetchone()[0]

    subject_ids = {}

    for subject in SUBJECTS:
        cur.execute(
            """
            INSERT INTO subjects(name)
            VALUES (%s)
            ON CONFLICT(name)
            DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """,
            (subject,),
        )
        subject_ids[subject] = cur.fetchone()[0]

    topic_ids = {}

    for topic in TOPICS:
        parent_id = (
            topic_ids[topic["parent"]]
            if topic["parent"]
            else None
        )

        cur.execute(
            """
            INSERT INTO topics (
                subject_id,
                parent_topic_id,
                key,
                name
            )
            VALUES (%s, %s, %s, %s)
            ON CONFLICT(key)
            DO UPDATE SET
                subject_id = EXCLUDED.subject_id,
                parent_topic_id = EXCLUDED.parent_topic_id,
                name = EXCLUDED.name
            RETURNING id
            """,
            (
                subject_ids[topic["subject"]],
                parent_id,
                topic["key"],
                topic["name"],
            ),
        )
        topic_ids[topic["key"]] = cur.fetchone()[0]

    for (
        topic_key,
        question_type,
        question,
        answer,
    ) in QUESTIONS:
        cur.execute(
            """
            INSERT INTO questions (
                topic_id,
                type,
                question,
                answer
            )
            VALUES (%s, %s, %s, %s)
            ON CONFLICT(topic_id, question)
            DO UPDATE SET
                type = EXCLUDED.type,
                answer = EXCLUDED.answer
            """,
            (
                topic_ids[topic_key],
                question_type,
                question,
                answer,
            ),
        )

    for user_id in user_ids.values():
        for subject_name in DEFAULT_CURRICULUM_SUBJECTS:
            subject_id = subject_ids.get(subject_name)
            if not subject_id:
                continue
            cur.execute(
                """
                INSERT INTO user_subjects (
                    user_id,
                    subject_id
                )
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (user_id, subject_id),
            )


def ensure_initial_review(cur):

    cur.execute(
        """
        INSERT INTO reviews (
            user_id,
            question_id,
            repetition,
            interval,
            ease_factor,
            next_review,
            last_result,
            rev_id,
            sync_version,
            updated_at
        )
        SELECT
            u.id,
            q.id::text,
            0,
            0,
            2.5,
            EXTRACT(EPOCH FROM NOW()) * 1000,
            'not_started',
            1,
            1,
            NOW()
        FROM users u
        CROSS JOIN questions q
        WHERE u.id = (
            SELECT id
            FROM users
            ORDER BY id
            LIMIT 1
        )
        ORDER BY q.id
        LIMIT 1
        ON CONFLICT (user_id, question_id) DO NOTHING
        """
    )


def main():

    config = get_db_config()

    try:
        ensure_database_exists(config)
        apply_schema(config)
    except Exception as exc:
        print("Bootstrap failed:")
        print(exc)
        sys.exit(1)

    print("")
    print("Backend is ready.")
    print(
        "Start the API with: "
        "uvicorn main:app --reload --host 0.0.0.0 --port 8000"
    )


if __name__ == "__main__":
    main()
