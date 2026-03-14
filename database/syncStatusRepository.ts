import { SQLiteDatabase } from "expo-sqlite"

const STATUS_KEY = "sync_last_status"
const MESSAGE_KEY = "sync_last_message"
const TIMESTAMP_KEY = "sync_last_at"

export type SyncStatusValue =
  | "success"
  | "failed"
  | "unknown"

export interface SyncStatusRecord {
  status: SyncStatusValue
  message: string | null
  timestamp: number | null
}

async function upsertSetting(
  db: SQLiteDatabase,
  key: string,
  value: string
) {
  await db.runAsync(
    `
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key)
    DO UPDATE SET value = excluded.value
    `,
    [key, value]
  )
}

export async function setSyncStatus(
  db: SQLiteDatabase,
  status: SyncStatusValue,
  message: string | null,
  timestamp = Date.now()
): Promise<void> {
  await upsertSetting(db, STATUS_KEY, status)
  await upsertSetting(
    db,
    MESSAGE_KEY,
    message ?? ""
  )
  await upsertSetting(
    db,
    TIMESTAMP_KEY,
    String(timestamp)
  )
}

export async function getSyncStatus(
  db: SQLiteDatabase
): Promise<SyncStatusRecord> {
  const rows =
    await db.getAllAsync<{
      key: string
      value: string
    }>(
      `
      SELECT key, value
      FROM settings
      WHERE key IN (?, ?, ?)
      `,
      [STATUS_KEY, MESSAGE_KEY, TIMESTAMP_KEY]
    )

  const map = new Map<string, string>()

  for (const row of rows) {
    map.set(row.key, row.value)
  }

  const status =
    (map.get(STATUS_KEY) as SyncStatusValue) ??
    "unknown"
  const message =
    map.get(MESSAGE_KEY) || null
  const timestampValue = map.get(TIMESTAMP_KEY)
  const timestamp =
    timestampValue && !Number.isNaN(Number(timestampValue))
      ? Number(timestampValue)
      : null

  return {
    status,
    message,
    timestamp
  }
}
