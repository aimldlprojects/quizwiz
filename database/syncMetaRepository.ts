import { SQLiteDatabase } from "expo-sqlite"

const KEY_LAST_PUSH_REV = (userId: number) =>
  `sync_last_push_rev_${userId}`
const KEY_LAST_PULL_REV = (userId: number) =>
  `sync_last_pull_rev_${userId}`
const KEY_LAST_STATUS = (userId: number) =>
  `sync_last_status_${userId}`
const KEY_LAST_TIMESTAMP = (userId: number) =>
  `sync_last_time_${userId}`
const KEY_LAST_ERROR = (userId: number) =>
  `sync_last_error_${userId}`
const KEY_SYNC_DIRTY_AT = (userId: number) =>
  `sync_dirty_at_${userId}`

const syncMetaListeners = new Set<() => void>()
const permissionMetaListeners = new Set<() => void>()
const syncActivityListeners = new Set<() => void>()
let syncActivityCount = 0
let syncActivityLabel = "Syncing..."

function notifySyncMetaListeners() {
  for (const listener of syncMetaListeners) {
    listener()
  }
}

export function subscribeSyncMetaChanges(
  listener: () => void
) {
  syncMetaListeners.add(listener)

  return () => {
    syncMetaListeners.delete(listener)
  }
}

function notifyPermissionMetaListeners() {
  for (const listener of permissionMetaListeners) {
    listener()
  }
}

export function notifyPermissionMetaChanges() {
  notifyPermissionMetaListeners()
}

export function subscribePermissionMetaChanges(
  listener: () => void
) {
  permissionMetaListeners.add(listener)

  return () => {
    permissionMetaListeners.delete(listener)
  }
}

function notifySyncActivityListeners() {
  for (const listener of syncActivityListeners) {
    listener()
  }
}

export function subscribeSyncActivityChanges(
  listener: () => void
) {
  syncActivityListeners.add(listener)

  return () => {
    syncActivityListeners.delete(listener)
  }
}

export function beginSyncActivity(
  label = "Syncing..."
): void {
  syncActivityCount += 1
  syncActivityLabel = label
  notifySyncActivityListeners()
}

export function endSyncActivity(): void {
  syncActivityCount = Math.max(
    0,
    syncActivityCount - 1
  )
  if (syncActivityCount === 0) {
    syncActivityLabel = "Syncing..."
  }
  notifySyncActivityListeners()
}

export function isSyncActivityActive(): boolean {
  return syncActivityCount > 0
}

export function getSyncActivityLabel(): string {
  return syncActivityLabel
}

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
      value TEXT
    )
  `)

}

async function readValue(
  db: SQLiteDatabase,
  key: string
): Promise<number> {

  await ensureTable(db)

  const row = await db.getFirstAsync<{ value: string }>(
    `
    SELECT value
    FROM sync_meta
    WHERE key = ?
    `,
    [key]
  )

  return row ? Number(row.value) : 0

}

async function writeValue(
  db: SQLiteDatabase,
  key: string,
  value: string | number
): Promise<void> {

  await ensureTable(db)

  await db.runAsync(
    `
    INSERT INTO sync_meta (key, value)
    VALUES (?, ?)

    ON CONFLICT(key)
    DO UPDATE SET value = excluded.value
    `,
    [key, String(value)]
  )

}

export async function getLastPushRev(
  db: SQLiteDatabase,
  userId: number
): Promise<number> {
  return readValue(db, KEY_LAST_PUSH_REV(userId))
}

export async function setLastPushRev(
  db: SQLiteDatabase,
  userId: number,
  rev: number
): Promise<void> {
  await writeValue(db, KEY_LAST_PUSH_REV(userId), rev)
}

export async function getLastPullRev(
  db: SQLiteDatabase,
  userId: number
): Promise<number> {
  return readValue(db, KEY_LAST_PULL_REV(userId))
}

export async function setLastPullRev(
  db: SQLiteDatabase,
  userId: number,
  rev: number
): Promise<void> {
  await writeValue(db, KEY_LAST_PULL_REV(userId), rev)
}

export async function setSyncStatus(
  db: SQLiteDatabase,
  userId: number,
  status: string,
  timestamp: number,
  error?: string
): Promise<void> {

  await writeValue(
    db,
    KEY_LAST_STATUS(userId),
    status
  )
  await writeValue(
    db,
    KEY_LAST_TIMESTAMP(userId),
    timestamp
  )

  if (error) {
    await writeValue(
      db,
      KEY_LAST_ERROR(userId),
      error
    )
  }

}

export async function getSyncDirtyAt(
  db: SQLiteDatabase,
  userId: number
): Promise<number> {
  return readValue(
    db,
    KEY_SYNC_DIRTY_AT(userId)
  )
}

export async function markSyncDirty(
  db: SQLiteDatabase,
  userId: number,
  timestamp = Date.now()
): Promise<void> {
  await writeValue(
    db,
    KEY_SYNC_DIRTY_AT(userId),
    timestamp
  )
  notifySyncMetaListeners()
}

export async function markPermissionsDirty(
  db: SQLiteDatabase,
  userId: number,
  timestamp = Date.now()
): Promise<void> {
  await writeValue(
    db,
    `permissions_dirty_at_${userId}`,
    timestamp
  )
  notifyPermissionMetaListeners()
}

export async function clearSyncDirty(
  db: SQLiteDatabase,
  userId: number
): Promise<void> {
  await writeValue(
    db,
    KEY_SYNC_DIRTY_AT(userId),
    0
  )
  notifySyncMetaListeners()
}

export async function getSyncMeta(
  db: SQLiteDatabase,
  userId: number
): Promise<{
  lastPushRev: number
  lastPullRev: number
  lastStatus: string | null
  lastTimestamp: number
  lastError: string | null
}> {

  await ensureTable(db)

  const rows = await db.getAllAsync<{
    key: string
    value: string
  }>(
    `
    SELECT key, value
    FROM sync_meta
    WHERE key IN (?, ?, ?, ?, ?)
    `,
    [
      KEY_LAST_PUSH_REV(userId),
      KEY_LAST_PULL_REV(userId),
      KEY_LAST_STATUS(userId),
      KEY_LAST_TIMESTAMP(userId),
      KEY_LAST_ERROR(userId),
    ]
  )

  const map = new Map<string, string>()

  for (const row of rows) {
    map.set(row.key, row.value)
  }

  return {
    lastPushRev:
      Number(map.get(KEY_LAST_PUSH_REV(userId))) || 0,
    lastPullRev:
      Number(map.get(KEY_LAST_PULL_REV(userId))) || 0,
    lastStatus: map.get(KEY_LAST_STATUS(userId)) || null,
    lastTimestamp:
      Number(map.get(KEY_LAST_TIMESTAMP(userId))) || 0,
    lastError: map.get(KEY_LAST_ERROR(userId)) || null,
  }

}
