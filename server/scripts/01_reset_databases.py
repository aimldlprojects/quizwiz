#!/usr/bin/env python
"""
Reset helpers for the master Postgres database and the Expo SQLite file.

Options:
  --master           Back up Postgres (under backups/master_backup_<timestamp>.sql) and rerun bootstrap.
  --local            Delete the Expo SQLite file so the app rebuilds it on next launch.
  --both             Run both master and local reset steps.
  --local-path PATH  Override the local SQLite path (defaults to database/local.sqlite).
  --android-package  Specify the Android package name to reset (default: host.exp.exponent).
  --android-db-name  Override the name of the SQLite file stored on the device (defaults to quizwiz.db).

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
from datetime import datetime, timezone
from pathlib import Path

# Ensure the repository root is on sys.path so `from server import ...` works when this script is run directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from server import db as server_db
from server.config.app_config import BACKUP_DIR, LOCAL_SQLITE_PATH

DEFAULT_ANDROID_PACKAGE = os.getenv(
    "ANDROID_PACKAGE",
    "host.exp.exponent"
)

DEFAULT_ANDROID_DB_NAME = os.getenv(
    "ANDROID_DB_NAME",
    "quizwiz.db"
)


def run_subprocess(cmd, env=None):
    print("Running:", " ".join(cmd))
    result = subprocess.run(cmd, env=env)
    if result.returncode != 0:
        sys.exit(result.returncode)


def _parse_adb_devices_output(output: str):
    devices = []
    lines = output.strip().splitlines()
    for line in lines[1:]:
        stripped = line.strip()
        if not stripped:
            continue
        parts = stripped.split()
        if len(parts) >= 2 and parts[1] == "device":
            devices.append(parts[0])
    return devices


def _reset_device_sqlite(adb_path, package_name, db_filename):
    if not adb_path:
        print("adb not found in PATH; cannot reset connected devices.")
        return False

    result = subprocess.run(
        [adb_path, "devices"],
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        print("Failed to enumerate Android devices:", result.stderr.strip())
        return False

    devices = _parse_adb_devices_output(result.stdout)

    if not devices:
        print("No Android devices detected; device reset skipped.")
        return False

    success = True
    db_path = f"/data/data/{package_name}/databases/{db_filename}"
    paths = [
        db_path,
        f"{db_path}-wal",
        f"{db_path}-shm",
        f"{db_path}-journal",
    ]

    for serial in devices:
        stop_cmd = [
            adb_path,
            "-s",
            serial,
            "shell",
            "am",
            "force-stop",
            package_name,
        ]

        subprocess.run(
            stop_cmd,
            capture_output=True,
            text=True,
            check=False,
        )

        cmd = [
            adb_path,
            "-s",
            serial,
            "shell",
            "run-as",
            package_name,
            "rm",
            "-f",
            *paths,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode == 0:
            print(
                f"Deleted {db_filename} on {serial}; device will recreate it on next launch."
            )
            continue

        stderr = result.stderr.strip()
        stdout = result.stdout.strip()
        message = stderr or stdout or "unknown error"
        print(
            f"Failed to delete {db_filename} on {serial} via run-as: {message}"
        )
        success = False

        if "package not debuggable" in message.lower():
            fallback_cmd = [
                adb_path,
                "-s",
                serial,
                "shell",
                "rm",
                "-f",
                *paths,
            ]

            fallback = subprocess.run(
                fallback_cmd,
                capture_output=True,
                text=True,
                check=False,
            )

            fallback_msg = (
                fallback.stderr.strip()
                or fallback.stdout.strip()
                or "unknown error"
            )

            if fallback.returncode == 0:
                print(
                    f"Deleted {db_filename} on {serial} using direct shell rm; device will recreate it on next launch."
                )
            else:
                print(
                    "Direct shell cleanup failed "
                    "because the package is not debuggable. "
                    "Uninstall Expo Go or install a custom dev client, "
                    "or run `adb shell rm -f /data/data/"
                    f"{package_name}/databases/{db_filename}*` manually "
                    "while the app is stopped."
                )

            clear_cmd = [
                adb_path,
                "-s",
                serial,
                "shell",
                "pm",
                "clear",
                package_name,
            ]

            clear_result = subprocess.run(
                clear_cmd,
                capture_output=True,
                text=True,
                check=False,
            )

            if clear_result.returncode == 0:
                print(
                    f"Cleared {package_name} data on {serial}; all cached files (including the database) were removed."
                )
                success = True
                continue
            else:
                print(
                    "pm clear failed; please manually run "
                    f"`adb shell pm clear {package_name}` when the app is stopped."
                )
    return success


def backup_master():
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    config = server_db.get_db_config()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%SZ")
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


def terminate_master_connections():
    sessions = server_db.fetch_rows(
        """
        SELECT pid, state, query
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
        """
    )

    if not sessions:
        print("No other quizwiz connections are active.")
        return

    print(
        "Terminating quizwiz PIDs:",
        [session["pid"] for session in sessions]
    )

    print(
        "Terminating",
        len(sessions),
        "other quizwiz connection(s) before reset..."
    )

    server_db.fetch_rows(
        """
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
        """
    )

    print("Existing quizwiz connections were terminated.")


def reset_master():
    terminate_master_connections()
    backup_master()
    # bootstrap_env = os.environ.copy()
    # # Never seed initial review/progress rows during a reset.
    # bootstrap_env["SEED_INITIAL_REVIEWS"] = "false"
    # run_subprocess(["python", "server/bootstrap.py"], env=bootstrap_env)
    run_subprocess(["python", "server/bootstrap.py"])
    normalize_spell_bee_questions()


def normalize_spell_bee_questions():
    """
    Convert legacy fill-in-the-blank spelling prompts into full-sentence
    Spell Bee prompts where the hidden word is no longer stored masked.

    Example:
      "Fill in the blank: The sun is h_t." + answer "hot"
      -> "The sun is hot."
    """
    conn = server_db.get_db()
    cur = conn.cursor()

    try:
        # 1) English spelling rows: make type align with spell-bee runtime type.
        cur.execute(
            """
            UPDATE questions q
            SET type = 'english-spell-bee'
            FROM topics t
            WHERE q.topic_id = t.id
              AND t.key IN (
                'two_letter_words',
                'three_letter_words',
                'four_letter_words',
                'five_letter_words',
                'six_letter_words',
                'seven_letter_words'
              )
              AND q.type = 'spelling-fill-blank'
            """
        )

        # 2) Remove "Fill in the blank:" prefix when present.
        cur.execute(
            """
            UPDATE questions
            SET question = trim(
              regexp_replace(
                question,
                '^\\s*Fill in the blank:\\s*',
                '',
                'i'
              )
            )
            WHERE type IN ('english-spell-bee', 'science-spelling', 'spelling-fill-blank')
            """
        )

        # 3) Replace masked tokens (__, m_t, p__net, etc.) with the answer.
        #    Pattern matches one non-space token that contains at least one underscore.
        cur.execute(
            """
            UPDATE questions
            SET question = trim(
              regexp_replace(
                question,
                '\\m[^[:space:]]*_[^[:space:]]*\\M',
                answer,
                'g'
              )
            )
            WHERE type IN ('english-spell-bee', 'science-spelling', 'spelling-fill-blank')
              AND question ~ '_'
            """
        )

        conn.commit()
        print("Normalized legacy spelling questions for Spell Bee runtime.")
    finally:
        cur.close()
        conn.close()


def reset_local(path, android_package, android_db_name):
    path = path or LOCAL_SQLITE_PATH
    if os.path.exists(path):
        print("Deleting local database", path)
        os.remove(path)
    else:
        print("Local database not found at", path)

    adb_path = shutil.which("adb")
    _reset_device_sqlite(adb_path, android_package, android_db_name)


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
    parser.add_argument(
        "--android-package",
        help="Android package name that homes the app database (default: host.exp.exponent).",
    )
    parser.add_argument(
        "--android-db-name",
        help="Name of the SQLite database file on the device (default: quizwiz.db).",
    )

    args = parser.parse_args()

    android_package = (
        args.android_package
        if args.android_package
        else DEFAULT_ANDROID_PACKAGE
    )
    android_db_name = (
        args.android_db_name
        if args.android_db_name
        else DEFAULT_ANDROID_DB_NAME
    )

    if not (args.master or args.local or args.both):
        parser.print_usage()
        sys.exit(1)

    if args.master or args.both:
        reset_master()

    if args.local or args.both:
        reset_local(
            args.local_path,
            android_package,
            android_db_name,
        )


if __name__ == "__main__":
    main()
