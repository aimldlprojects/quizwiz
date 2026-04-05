import os
from pathlib import Path
from threading import Lock
from enum import IntEnum


class LogLevel(IntEnum):
    ERROR = 0
    WARNING = 1
    INFO = 2
    DEBUG = 3


def _configured_level(env_name: str, default: str):
    raw = os.getenv(env_name, default).strip().upper()
    if raw in LogLevel.__members__:
        return LogLevel[raw]
    return LogLevel[default]


FILE_LOG_LEVEL = _configured_level("SYNC_FILE_LOG_LEVEL", "DEBUG")
CONSOLE_LOG_LEVEL = _configured_level("SYNC_CONSOLE_LOG_LEVEL", "WARNING")
LOG_FILE_ENABLED = os.getenv("SYNC_LOG_TO_FILE", "1").strip().lower() not in {
    "0",
    "false",
    "no",
    "off",
}
LOG_FILE_PATH = (
    Path(__file__).resolve().parents[1] / "logs" / "sync-trace.log"
)
_FILE_LOCK = Lock()


def _should_log(level: LogLevel) -> bool:
    return level <= FILE_LOG_LEVEL


def _should_console_log(level: LogLevel) -> bool:
    return level <= CONSOLE_LOG_LEVEL


def _write_file(prefix: str, message: str, *args):
    if not LOG_FILE_ENABLED:
        return

    try:
        LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _FILE_LOCK:
            with LOG_FILE_PATH.open("a", encoding="utf-8") as handle:
                print(prefix, message, *args, file=handle, flush=True)
    except Exception:
        return


def _emit(level: LogLevel, prefix: str, message: str, *args):
    if not _should_log(level):
        return

    _write_file(prefix, message, *args)

    if _should_console_log(level):
        print(prefix, message, *args)


def log_debug(message: str, *args):
    _emit(LogLevel.DEBUG, "[sync-debug]", message, *args)


def log_info(message: str, *args):
    _emit(LogLevel.INFO, "[sync-info]", message, *args)


def log_warning(message: str, *args):
    _emit(LogLevel.WARNING, "[sync-warning]", message, *args)


def log_error(message: str, *args):
    _emit(LogLevel.ERROR, "[sync-error]", message, *args)
