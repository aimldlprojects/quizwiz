import os

import psycopg2
from psycopg2 import sql

try:
    import pandas as pd
except ImportError:  # pragma: no cover - optional dependency
    pd = None


def get_db_config():

    return {
        "host": os.getenv("QUIZWIZ_DB_HOST", "localhost"),
        "database": os.getenv("QUIZWIZ_DB_NAME", "quizwiz"),
        "user": os.getenv("QUIZWIZ_DB_USER", "postgres"),
        "password": os.getenv("QUIZWIZ_DB_PASSWORD", "password"),
        "port": int(
            os.getenv("QUIZWIZ_DB_PORT", "5432")
        ),
    }


def get_db():

    conn = psycopg2.connect(
        **get_db_config()
    )

    return conn


def fetch_rows(query, params=None):

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(query, params or ())

        columns = [
            desc[0]
            for desc in cur.description or []
        ]

        rows = cur.fetchall()

        return [
            dict(zip(columns, row))
            for row in rows
        ]
    finally:
        cur.close()
        conn.close()


def execute_query(
    query,
    params=None,
    fetch=False
):

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(query, params or ())
        conn.commit()

        if not fetch:
            return cur.rowcount

        columns = [
            desc[0]
            for desc in cur.description or []
        ]

        rows = cur.fetchall()

        return [
            dict(zip(columns, row))
            for row in rows
        ]
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def fetch_table_rows(
    table_name,
    limit=None
):

    conn = get_db()
    cur = conn.cursor()

    try:
        query = sql.SQL(
            "SELECT * FROM {}"
        ).format(sql.Identifier(table_name))

        if limit is not None:
            query = sql.SQL(
                "{} LIMIT %s"
            ).format(query)
            cur.execute(query, (limit,))
        else:
            cur.execute(query)

        columns = [
            desc[0]
            for desc in cur.description or []
        ]

        rows = cur.fetchall()

        return [
            dict(zip(columns, row))
            for row in rows
        ]
    finally:
        cur.close()
        conn.close()


def fetch_table_df(
    table_name,
    limit=None
):

    rows = fetch_table_rows(
        table_name,
        limit
    )

    if pd is None:
        raise ImportError(
            "pandas is required to return a DataFrame."
        )

    return pd.DataFrame(rows)


def print_table_df(
    table_name,
    limit=None
):

    df = fetch_table_df(
        table_name,
        limit
    )

    print(df)

    return df
