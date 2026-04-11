from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from server import db as server_db

def main():
    tables = server_db.fetch_rows(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
        """
    )

    for table_row in tables:
        table = table_row["table_name"]
        print(f"Table: {table}")

        columns = server_db.fetch_rows(
            """
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position
            """,
            (table,),
        )
        for column in columns:
            print("  ", column["column_name"], column["data_type"], column["is_nullable"])

        constraint_rows = server_db.fetch_rows(
            """
            SELECT
                tc.constraint_type,
                tc.constraint_name,
                kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_name = kcu.table_name
            WHERE tc.table_name = %s
            ORDER BY tc.constraint_type, kcu.ordinal_position
            """,
            (table,),
        )
        if constraint_rows:
            print("  Constraints:")
            for constraint_row in constraint_rows:
                print(
                    "    ",
                    constraint_row["constraint_type"],
                    constraint_row["constraint_name"],
                    constraint_row["column_name"],
                )

        indexes = server_db.fetch_rows(
            """
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = %s
            ORDER BY indexname
            """,
            (table,),
        )
        if indexes:
            print("  Indexes:")
            for index_row in indexes:
                print("    ", index_row["indexname"])
                print("      ", index_row["indexdef"])

        print()

if __name__ == "__main__":
    main()
