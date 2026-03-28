# Sync Configuration & Reset Guide

## Frontend sync knobs (`config/sync.ts`)

| Variable | Meaning | Default | Notes |
| --- | --- | --- | --- |
| `pullTimeoutMs` | How long the mobile app waits for `/reviews/pull` before aborting | `15000` | If your payload grows, increase this or paginate the response instead of disabling the timer. |
| `pushChunkSize` | Number of local review rows pushed in a single request | `128` | Smaller chunk sizes reduce payload; increase if the server is fast. |
| `syncIntervalMs` | Background sync timer interval | `60000` | Used by `SyncLifecycle` defaults when settings are missing. |
| `syncMinGapMs` | Minimum gap between sync attempts | `30000` | Prevents back-to-back syncs even if the timer fires. |
| `statsBatchSize` | Suggested size when filtering stats locally (reserved for future use) | `1024` | Documented so you know where to tune stats pagination. |
| `defaultServerUrl` | Fallback master server URL | `http://localhost:8000` | `getSyncServerUrl` still prefers the persisted value, but this acts as a sane default. |

Override any of these by adding them to `app.json` or `app.config.js` under `extra`. Example snippet:

```jsonc
{
  "expo": {
    "extra": {
      "syncPullTimeoutMs": 20000,
      "syncPushChunkSize": 256,
      "syncIntervalMs": 45000,
      "syncMinGapMs": 20000,
      "syncDebugLogs": true
    }
  }
}
```

## Backend configuration (`server/config/app_config.py`)

| Variable | Purpose | Default / Source |
| --- | --- | --- |
| `BACKUP_DIR` | Location where `01_reset_databases.py` writes `master_backup_<timestamp>.sql` | `backups/` at the repository root |
| `LOCAL_SQLITE_PATH` | Path deleted when you reset the local Expo DB (`--local`) | `database/local.sqlite` |
| `SYNC_RESET_TABLES` | Tables dropped before schema reapplication | Core tables such as `reviews`, `stats`, `users`, etc. |
| `SYNC_PULL_TIMEOUT_MS` | Mirrors the expo app’s pull timeout | `15000` (override via `SYNC_PULL_TIMEOUT_MS` env var) |
| `SYNC_PUSH_CHUNK_SIZE` | Mirrors the expo push chunk | `128` (override via `SYNC_PUSH_CHUNK_SIZE`) |
| `SYNC_DROP_BEFORE_BOOTSTRAP` | Toggles dropping tables before re-running migrations | `true` by default; set `false` to keep data during development |

These constants are consumed by `server/bootstrap.py` (for schema/reset) and by the backend scripts. To change them, edit the environment variables or the config file directly if you need a permanent override.

## Resetting & initializing the environment

1. **Backup & reset the master DB**  
   ```bash
   python server/scripts/01_reset_databases.py --master
   ```
   This uses `pg_dump` to back up according to `BACKUP_DIR`, then drops the tables (via `SYNC_RESET_TABLES`) before re-applying the schema and seeding the sample data defined in `server/bootstrap.py`.

2. **Wipe the local Expo SQLite file**  
   ```bash
   python server/scripts/01_reset_databases.py --local
   ```
   or `--local-path` if you keep a custom SQLite path. This deletes `database/local.sqlite`, forcing the app to rebuild it on the next launch.

3. **Reset both in one go (recommended before shipping new seeds)**  
   ```bash
   python server/scripts/01_reset_databases.py --both
   ```
   The script already creates a timestamped backup before any destructive action.

4. **Run the mobile app**  
   Launch `expo start`, open the profile screen, and tap the sync icon when it turns orange or red. The icon should turn green after the sync completes. If the backend takes longer than the config’s `pullTimeoutMs`, increase that value or break the payload into smaller batches.

## Additional tips

- The frontend keeps the sync status badges in `settings` keys such as `sync_last_status_pull`; those are updated via `services/sync/syncReviews.ts` whenever a push/pull succeeds or fails.  
- The 15 s timeout is a safety valve; keep it unless you have a strong reason to let the UI hang, and consider making it configurable via `extra` or the backend env vars described above.  
- Adding new sample data to `server/bootstrap.py` will automatically be reapplied whenever the database is reset, thanks to the table drop sequence and the `ensure_initial_review` seed.  
- Want to silence/expand the sync logs? See `docs/logging.md` for the frontend extra flags and the backend `SYNC_LOG_LEVEL` hook.  
- Subject/topic toggles now require two taps on the track screen: the first tap “arms” the chip to be changed, the second tap toggles its enabled state. The blue dashed border shown during the first tap cues that you must tap again to confirm.

## Default curriculum & hybrid sync mode

- The Expo client now comes up in `hybrid` mode by default (`config/curriculum.ts` and `database/initDB.ts`); switching off sync requires manual toggling in the profile settings screen.  
- Every user (seeded or newly created) only gets access to the `Mathematics` subject and the `multiplication_tables` topic tree until you manually grant more via the UI (`hooks/useUsers.ts` uses the new defaults).  
- The Postgres backend mirrors that: `server/config/app_config.py` lists `DEFAULT_CURRICULUM_SUBJECTS` and `server/bootstrap.py` uses it when populating `user_subjects`. If you want to expand the default curriculum, update those constants and rerun `python server/scripts/01_reset_databases.py --master` so the new assignment applies to the master data before pushing to devices.
