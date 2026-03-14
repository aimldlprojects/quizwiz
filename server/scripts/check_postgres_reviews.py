import psycopg2
import os

DB_CONFIG = {
    "host": os.getenv("QUIZWIZ_DB_HOST", "localhost"),
    "database": os.getenv("QUIZWIZ_DB_NAME", "quizwiz"),
    "user": os.getenv("QUIZWIZ_DB_USER", "postgres"),
    "password": os.getenv("QUIZWIZ_DB_PASSWORD", "password"),
    "port": int(os.getenv("QUIZWIZ_DB_PORT", "5432")),
}

conn = psycopg2.connect(**DB_CONFIG)
cursor = conn.cursor()

cursor.execute("SELECT * FROM reviews LIMIT 10")

rows = cursor.fetchall()

print("\nREVIEWS TABLE\n")

for r in rows:
    print(r)

cursor.close()
conn.close()