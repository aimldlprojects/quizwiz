# Logging configuration

## Frontend logging (`config/logging.ts`)

- `syncConsoleLogs`: `true`/`false` (default `true`). If disabled, `logSyncConsole` no longer prints.
- `syncDebugLogs`: `true`/`false` (default `false`). Controls the `logSyncDebug` statements from the sync services.
- `syncLogLevel`: one of `error`, `warning`, `info`, `debug` (default `info`). Controls how verbose the console logging should be; DEBUG statements only show when `syncLogLevel` is `debug`, warnings/error always appear at or above their severity.

These values can be placed in `app.json` under `expo.extra`, for example:

```json
{
  "expo": {
    "extra": {
      "syncConsoleLogs": true,
      "syncDebugLogs": true,
      "syncLogLevel": "debug"
    }
  }
}
```

The mobile sync workers (`pullReviews`, `pushReviews`, `syncReviews`) now respect this config, so hitting the debug toggle or lowering the log level is enough to quiet you down.

## Backend logging (`server/config/log_config.py`)

- `SYNC_LOG_LEVEL`: set this environment variable to `ERROR`, `WARNING`, `INFO`, or `DEBUG`. If omitted, the default is `INFO`.
- The module exposes helpers `log_debug`, `log_info`, `log_warning`, and `log_error` that guard their output against the configured level.

Use them in routes, scripts, or bootstrap when you want the logs to honor that global cutoff rather than always printing via `print(...)`.

```bash
SYNC_LOG_LEVEL=DEBUG python server/scripts/01_reset_databases.py --both
```

## When to adjust the knobs

1. Lower the front-end `syncLogLevel` to `warning` or `error` when you want quieter output during manual testing.  
2. Turn on `syncDebugLogs` only when you need the `[sync-debug]` console lines; otherwise keep it off to avoid noise.  
3. Set `SYNC_LOG_LEVEL=DEBUG` on the backend when a sync fails and you need more detail about query counts and durations, then revert to `INFO` or `WARNING` for normal use.
