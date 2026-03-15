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
      user_id INTEGER NOT NULL DEFAULT 0,
      key TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY(user_id, key)
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
    INSERT INTO settings (user_id, key, value)
    VALUES (0, 'sync_mode', ?)

    ON CONFLICT(user_id, key)
    DO UPDATE SET value = excluded.value
    `,
      [mode]
    )

}

const SYNC_INTERVAL_KEY = "sync_interval_ms"
const SYNC_MIN_GAP_KEY = "sync_min_gap_ms"

const DEFAULT_SYNC_INTERVAL_MS = 60_000
const DEFAULT_SYNC_MIN_GAP_MS = 30_000

async function getNumericSetting(
  db: SQLiteDatabase,
  key: string,
  fallback: number
): Promise<number> {

  const row =
    await db.getFirstAsync<{ value: string }>(
      `
      SELECT value
      FROM settings
      WHERE key = ?
      `,
      [key]
    )

  const value =
    row && !Number.isNaN(Number(row.value))
      ? Number(row.value)
      : fallback

  return value

}

async function setNumericSetting(
  db: SQLiteDatabase,
  key: string,
  value: number
): Promise<void> {

    await db.runAsync(
      `
    INSERT INTO settings (user_id, key, value)
    VALUES (0, ?, ?)
    ON CONFLICT(user_id, key)
    DO UPDATE SET value = excluded.value
    `,
      [key, String(value)]
    )

}

export async function getSyncIntervalMs(
  db: SQLiteDatabase
): Promise<number> {
  return getNumericSetting(
    db,
    SYNC_INTERVAL_KEY,
    DEFAULT_SYNC_INTERVAL_MS
  )
}

export async function setSyncIntervalMs(
  db: SQLiteDatabase,
  value: number
): Promise<void> {
  await setNumericSetting(db, SYNC_INTERVAL_KEY, value)
}

export async function getSyncMinGapMs(
  db: SQLiteDatabase
): Promise<number> {
  return getNumericSetting(
    db,
    SYNC_MIN_GAP_KEY,
    DEFAULT_SYNC_MIN_GAP_MS
  )
}

export async function setSyncMinGapMs(
  db: SQLiteDatabase,
  value: number
): Promise<void> {
  await setNumericSetting(db, SYNC_MIN_GAP_KEY, value)
}
