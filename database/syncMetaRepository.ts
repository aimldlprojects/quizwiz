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
  db: SQLiteDatabase,
  userId: number
): Promise<number> {

  await ensureTable(db)

  const row = await db.getFirstAsync<{ value: number }>(
    `
    SELECT value
    FROM sync_meta
    WHERE key = ?
    `,
    [`reviews_last_rev_${userId}`]
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
  userId: number,
  rev: number
): Promise<void> {

  await ensureTable(db)

  await db.runAsync(
    `
    INSERT INTO sync_meta (key, value)
    VALUES (?, ?)

    ON CONFLICT(key)
    DO UPDATE SET value = excluded.value
    `,
    [`reviews_last_rev_${userId}`, rev]
  )

}
