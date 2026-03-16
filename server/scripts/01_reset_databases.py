#!/usr/bin/env python
"""
Reset helpers for the master Postgres database and the Expo SQLite file.

Options:
  --master           Back up Postgres (under backups/master_backup_<timestamp>.sql) and rerun bootstrap.
  --local            Delete the Expo SQLite file so the app rebuilds it on next launch.
  --both             Run both master and local reset steps.
  --local-path PATH  Override the local SQLite path (defaults to database/local.sqlite).

Run from the repo root with 
`python server/scripts/01_reset_databases.py --master` to reset the server DB, 
`python server/scripts/01_reset_databases.py --local` to reset the local DB, or 
`python server/scripts/01_reset_databases.py --both` to reset both.
"""

import argparse
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Ensure the repository root is on sys.path so `from server import ...` works when this script is run directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from server import db as server_db
from server.config.app_config import BACKUP_DIR, LOCAL_SQLITE_PATH


def run_subprocess(cmd, env=None):
    print("Running:", " ".join(cmd))
    result = subprocess.run(cmd, env=env)
    if result.returncode != 0:
        sys.exit(result.returncode)


def backup_master():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    config = server_db.get_db_config()
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    destination = BACKUP_DIR / f"master_backup_{timestamp}.sql"
    env = os.environ.copy()
    if config.get("password"):
        env["PGPASSWORD"] = config["password"]
    pg_dump = shutil.which("pg_dump")
    if not pg_dump:
        raise FileNotFoundError(
            "pg_dump not found in PATH. Please install PostgreSQL tools or add pg_dump to PATH."
        )
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
    run_subprocess(cmd, env)
    print("Master backup written to", destination)


def reset_master():
    backup_master()
    run_subprocess(["python", "server/bootstrap.py"])


def reset_local(path):
    path = path or LOCAL_SQLITE_PATH
    if os.path.exists(path):
        print("Deleting local database", path)
        os.remove(path)
    else:
        print("Local database not found at", path)


def main():
    parser = argparse.ArgumentParser(
        description="Reset master/local databases."
    )
    parser.add_argument(
        "--master", action="store_true", help="Reset server DB via bootstrap."
    )
    parser.add_argument(
        "--local", action="store_true", help="Delete local Expo SQLite file."
    )
    parser.add_argument(
        "--both",
        action="store_true",
        help="Reset both master and local databases.",
    )
    parser.add_argument(
        "--local-path",
        help="Custom path to the local SQLite file to delete.",
    )

    args = parser.parse_args()

    if not (args.master or args.local or args.both):
        parser.print_usage()
        sys.exit(1)

    if args.master or args.both:
        reset_master()

    if args.local or args.both:
        reset_local(args.local_path)


if __name__ == "__main__":
    main()
