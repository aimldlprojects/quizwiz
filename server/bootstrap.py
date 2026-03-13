from pathlib import Path
import sys

import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from db import get_db_config


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
        with conn.cursor() as cur:
            cur.execute(schema_sql)
            migrate_reviews_table(cur)

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
        ALTER COLUMN question_id TYPE BIGINT,
        ALTER COLUMN rev_id TYPE BIGINT,
        ALTER COLUMN next_review TYPE BIGINT
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
