# Docs Maintenance

Use this short policy when updating docs.

For project reset steps, see [Reset Project](#reset-project).

## Keep

- screen behavior in `docs/ui/`
- sync behavior in `docs/business-logic/sync-settings-requirement.md`
- topic selection behavior in `docs/business-logic/topic selection rules.md`
- question behavior in `docs/business-logic/question-requirements.md`
- general question flow in `docs/business-logic/question-flow.md`
- table topic flow in `docs/business-logic/table-topic-flow.md`
- meanings of words in `docs/glossary.md`
- local versus global data in `docs/data-ownership.md`
- short change notes in `docs/templates/change-log.md`

## Merge Later If Needed

- `docs/data-ownership.md` into `docs/business-logic/sync-settings-requirement.md`
- `docs/templates/change-log.md` into `docs/index.md`

## Rules

- keep docs short
- use UI words first
- keep one canonical place for each behavior
- avoid repeating the same rule in more than one file unless it is a short pointer

## Reset Project

Use the reset script from the repo root when you want to rebuild the databases.

### Master database reset

This backs up the Postgres database, reruns bootstrap, and reseeds the default demo data.

```bash
python server/scripts/01_reset_databases.py --master
```

### Local app database reset

This deletes the local Expo SQLite database on disk or on connected Android devices.

```bash
python server/scripts/01_reset_databases.py --local
```

### Reset both

```bash
python server/scripts/01_reset_databases.py --both
```

### Notes

- `--master` will also seed the default registered devices: `eshu_s22`, `bhavi_tab`, and `mabhu_tab`.
- You can override the local SQLite path with `--local-path`.
- You can override the Android package name with `--android-package`.
- You can override the Android database filename with `--android-db-name`.

## Reference Docs

- See [Docs Index](./index.md) for the full docs map.
- See [UI Reference](./ui/README.md) for the screen-by-screen guide.
- See [Sync Settings Requirement](./business-logic/sync-settings-requirement.md) for sync behavior.
- See [Topic Selection Rules](./topic%20selection%20rules.md) for selection rules.
- See [Question Requirements](./business-logic/question-requirements.md) for question behavior.
- See [Question Flow](./business-logic/question-flow.md) for general question rules.
- See [Table Topic Flow](./business-logic/table-topic-flow.md) for table behavior.
- See [Glossary](./glossary.md) for word meanings.
- See [Data Ownership](./data-ownership.md) for local vs global data.
- See [Change Log](./templates/change-log.md) for recent changes.
