# Restore After Reset

Use this when the server database has been reset and you want to bring back the
user-state tables from a master backup without touching the current questions
catalog.

## What gets restored

- `badges`
- `user_badges`
- `sync_meta`
- `settings`
- `reviews`
- `stats`

## What stays as-is

- `questions`
- `topics`
- `subjects`
- `users`

The restore script remaps saved question ids and topic ids to the current
catalog, so the new seeded table question ids stay intact.

## Safe order

1. Reset the server database.
2. Seed or ingest the current question catalog.
3. Restore user-state data from the backup.

## Command

```bash
python server/scripts/restore_master_state.py backups/master_backup_20260409052028Z.sql
```

If you omit the backup path, the script uses the newest `master_backup_*.sql`
file in `backups/`.

## Notes

- The script does not restore question rows, so current table ids are preserved.
- Rows that cannot be matched to the current catalog are skipped and reported.
- This is the right path when practice history should survive a reset but the
  question catalog has been reseeded separately.
