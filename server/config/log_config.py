import os
from enum import IntEnum


class LogLevel(IntEnum):
    ERROR = 0
    WARNING = 1
    INFO = 2
    DEBUG = 3


def _configured_level():
    raw = os.getenv("SYNC_LOG_LEVEL", "INFO").strip().upper()
    if raw in LogLevel.__members__:
        return LogLevel[raw]
    return LogLevel.INFO


LOG_LEVEL = _configured_level()


def _should_log(level: LogLevel) -> bool:
    return level <= LOG_LEVEL


def log_debug(message: str, *args):
    if not _should_log(LogLevel.DEBUG):
        return
    print("[sync-debug]", message, *args)


def log_info(message: str, *args):
    if not _should_log(LogLevel.INFO):
        return
    print("[sync-info]", message, *args)


def log_warning(message: str, *args):
    if not _should_log(LogLevel.WARNING):
        return
    print("[sync-warning]", message, *args)


def log_error(message: str, *args):
    if not _should_log(LogLevel.ERROR):
        return
    print("[sync-error]", message, *args)
