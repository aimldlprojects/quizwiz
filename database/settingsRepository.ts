import { SQLiteDatabase } from "expo-sqlite"

export type SyncMode =
  | "local"
  | "hybrid"

/*
--------------------------------------------------
Init Settings Table
--------------------------------------------------
*/

export async function initSettings(
  db: SQLiteDatabase
): Promise<void> {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)

}

/*
--------------------------------------------------
Get Sync Mode
--------------------------------------------------
*/

export async function getSyncMode(
  db: SQLiteDatabase
): Promise<SyncMode> {

  const row =
    await db.getFirstAsync<{ value: SyncMode }>(
      `
      SELECT value
      FROM settings
      WHERE key = 'sync_mode'
      `
    )

  return row?.value ?? "local"

}

/*
--------------------------------------------------
Set Sync Mode
--------------------------------------------------
*/

export async function setSyncMode(
  db: SQLiteDatabase,
  mode: SyncMode
): Promise<void> {

  await db.runAsync(
    `
    INSERT INTO settings (key, value)
    VALUES ('sync_mode', ?)

    ON CONFLICT(key)
    DO UPDATE SET value = excluded.value
    `,
    [mode]
  )

}