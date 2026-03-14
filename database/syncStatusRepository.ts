import { SQLiteDatabase } from "expo-sqlite"

type SyncDirection = "overall" | "push" | "pull"

const STATUS_KEYS: Record<
  SyncDirection,
  { status: string; message: string; timestamp: string }
> = {
  overall: {
    status: "sync_last_status",
    message: "sync_last_message",
    timestamp: "sync_last_at"
  },
  push: {
    status: "sync_last_status_push",
    message: "sync_last_message_push",
    timestamp: "sync_last_at_push"
  },
  pull: {
    status: "sync_last_status_pull",
    message: "sync_last_message_pull",
    timestamp: "sync_last_at_pull"
  }
}

const ALL_SYNC_KEYS = Array.from(
  new Set(
    Object.values(STATUS_KEYS).flatMap((entry) => [
      entry.status,
      entry.message,
      entry.timestamp
    ])
  )
)

export type SyncStatusValue =
  | "success"
  | "failed"
  | "unknown"

export interface SyncStatusEntry {
  status: SyncStatusValue
  message: string | null
  timestamp: number | null
}

export interface SyncStatusRecord {
  overall: SyncStatusEntry
  push: SyncStatusEntry
  pull: SyncStatusEntry
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
  timestamp = Date.now(),
  direction: SyncDirection = "overall"
): Promise<void> {
  const keys = STATUS_KEYS[direction]

  await upsertSetting(db, keys.status, status)
  await upsertSetting(
    db,
    keys.message,
    message ?? ""
  )
  await upsertSetting(
    db,
    keys.timestamp,
    String(timestamp)
  )
}

function parseEntry(
  rows: Map<string, string>,
  direction: SyncDirection
): SyncStatusEntry {
  const keys = STATUS_KEYS[direction]

  const status =
    (rows.get(keys.status) as SyncStatusValue) ??
    "unknown"

  const message = rows.get(keys.message) || null
  const timestampValue = rows.get(keys.timestamp)
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
      WHERE key IN (${ALL_SYNC_KEYS.map(() => "?").join(", ")})
      `,
      ALL_SYNC_KEYS
    )

  const map = new Map<string, string>()

  for (const row of rows) {
    map.set(row.key, row.value)
  }

  return {
    overall: parseEntry(map, "overall"),
    push: parseEntry(map, "push"),
    pull: parseEntry(map, "pull")
  }
}
