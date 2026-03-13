import os

import psycopg2


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
