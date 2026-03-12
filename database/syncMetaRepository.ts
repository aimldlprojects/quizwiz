import { SQLiteDatabase } from "expo-sqlite"

/*
--------------------------------------------------
Init Sync Meta Table
--------------------------------------------------
*/

async function ensureTable(
  db: SQLiteDatabase
): Promise<void> {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_meta (

      key TEXT PRIMARY KEY,
      value INTEGER

    )
  `)

}

/*
--------------------------------------------------
Get Last Sync Revision
--------------------------------------------------
*/

export async function getLastSyncRev(
  db: SQLiteDatabase
): Promise<number> {

  await ensureTable(db)

  const row = await db.getFirstAsync<{ value: number }>(
    `
    SELECT value
    FROM sync_meta
    WHERE key = 'reviews_last_rev'
    `
  )

  return row?.value ?? 0

}

/*
--------------------------------------------------
Set Last Sync Revision
--------------------------------------------------
*/

export async function setLastSyncRev(
  db: SQLiteDatabase,
  rev: number
): Promise<void> {

  await ensureTable(db)

  await db.runAsync(
    `
    INSERT INTO sync_meta (key, value)
    VALUES ('reviews_last_rev', ?)

    ON CONFLICT(key)
    DO UPDATE SET value = excluded.value
    `,
    [rev]
  )

}