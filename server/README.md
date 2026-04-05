## First-Time Backend Setup

The backend expects PostgreSQL to be running locally by default.

Default connection values:

- `QUIZWIZ_DB_HOST=localhost`
- `QUIZWIZ_DB_PORT=5432`
- `QUIZWIZ_DB_NAME=quizwiz`
- `QUIZWIZ_DB_USER=postgres`
- `QUIZWIZ_DB_PASSWORD=password`

You can override any of them with environment variables before running the bootstrap script.

### First run

From the `server` folder:

```powershell
python bootstrap.py
```

That script will:

1. Create the `quizwiz` database if it does not exist.
2. Apply `database/schema.sql`.
3. Migrate the `reviews` table columns to `BIGINT` for sync-safe IDs.
4. Print the command to start FastAPI.

## Reset Project

Use the repo-root reset script when you need to rebuild the databases.

```powershell
python server/scripts/01_reset_databases.py --master
```

For the full set of reset options, see [docs/maintenance.md#reset-project](../docs/maintenance.md#reset-project).

### Start the API

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
