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


def _run_query(
    query,
    params=None,
    *,
    fetch=False,
    commit=False
):

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(query, params or ())

        if fetch:
            columns = [
                desc[0]
                for desc in cur.description or []
            ]

            rows = cur.fetchall()

            result = [
                dict(zip(columns, row))
                for row in rows
            ]
        else:
            result = cur.rowcount

        if commit:
            conn.commit()

        return result
    except Exception:
        if commit:
            conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def fetch_rows(query, params=None):

    return _run_query(
        query,
        params,
        fetch=True
    )

def fetch_df(query, params=None):
    return pd.DataFrame(fetch_rows(query, params))

def execute_write(
    query,
    params=None
):

    return _run_query(
        query,
        params,
        commit=True
    )


def fetch_table_rows(
    table_name,
    limit=None
):
    query = sql.SQL(
        "SELECT * FROM {}"
    ).format(sql.Identifier(table_name))

    params = None
    if limit is not None:
        query = sql.SQL(
            "{} LIMIT %s"
        ).format(query)
        params = (limit,)

    return _run_query(
        query,
        params,
        fetch=True
    )


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


