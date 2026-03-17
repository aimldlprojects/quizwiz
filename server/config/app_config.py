import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SERVER_ROOT = Path(__file__).resolve().parent

BACKUP_DIR = REPO_ROOT / "backups"
LOCAL_SQLITE_PATH = REPO_ROOT / "database" / "local.sqlite"

SYNC_RESET_TABLES = [
    "reviews",
    "stats",
    "settings",
    "user_badges",
    "user_subjects",
    "subjects",
    "topics",
    "questions",
    "sync_meta",
    "users",
]

SYNC_PULL_TIMEOUT_MS = int(
    os.getenv("SYNC_PULL_TIMEOUT_MS", "15000")
)

SYNC_PUSH_CHUNK_SIZE = int(
    os.getenv("SYNC_PUSH_CHUNK_SIZE", "128")
)

SYNC_DROP_BEFORE_BOOTSTRAP = os.getenv(
    "SYNC_DROP_BEFORE_BOOTSTRAP", "true"
).lower() in ("1", "true", "yes")

SEED_MASTER_DATA = os.getenv(
    "SEED_MASTER_DATA", "true"
).lower() in ("1", "true", "yes")

SEED_INITIAL_REVIEWS = os.getenv(
    "SEED_INITIAL_REVIEWS", "false"
).lower() in ("1", "true", "yes")

DEFAULT_CURRICULUM_SUBJECTS = ["Mathematics"]
