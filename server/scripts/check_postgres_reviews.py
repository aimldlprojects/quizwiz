from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from server import db as server_db

rows = server_db.fetch_table_rows("reviews", 10)

print("\nREVIEWS TABLE\n")

for row in rows:
    print(row)
