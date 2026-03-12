import psycopg2


def get_db():

    conn = psycopg2.connect(
        host="localhost",
        database="quizwiz",
        user="postgres",
        password="password"
    )

    return conn