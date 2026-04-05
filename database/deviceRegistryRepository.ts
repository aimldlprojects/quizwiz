import { SQLiteDatabase } from "expo-sqlite"

import { markSyncDirty } from "./syncMetaRepository"

export type RegisteredDevice = {
  backendKey: string
  displayName: string
  createdAt: number
  updatedAt: number
}

const DEVICE_REGISTRY_KEY = (userId: number) =>
  `device_registry_user_${userId}`
const ALLOWED_DEVICE_KEYS = (userId: number) =>
  `allowed_device_keys_user_${userId}`
const ACTIVE_DEVICE_KEY = (userId: number) =>
  `active_device_key_user_${userId}`

const DEVICE_SCOPE_SEPARATOR = "__device_"

function normalizeDisplayName(value: string) {
  return value.trim().toLowerCase()
}

function generateBackendKey() {
  const random =
    Math.random().toString(36).slice(2, 10)
  return `device_${Date.now()}_${random}`
}

async function ensureTable(
  db: SQLiteDatabase
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      user_id INTEGER NOT NULL DEFAULT 0,
      key TEXT NOT NULL,
      value TEXT,
      updated_at INTEGER DEFAULT (strftime('%s','now')*1000),
      sync_version INTEGER DEFAULT 1,
      PRIMARY KEY(user_id, key)
    )
  `)
}

async function readRegistry(
  db: SQLiteDatabase,
  userId: number
): Promise<RegisteredDevice[]> {
  await ensureTable(db)

  const row = await db.getFirstAsync<{
    value: string | null
  }>(
    `
    SELECT value
    FROM settings
    WHERE user_id = ?
      AND key = ?
    LIMIT 1
    `,
    [userId, DEVICE_REGISTRY_KEY(userId)]
  )

  if (!row?.value) {
    return []
  }

  try {
    const parsed = JSON.parse(row.value)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((entry) => ({
        backendKey: String(entry?.backendKey ?? ""),
        displayName: String(entry?.displayName ?? ""),
        createdAt: Number(entry?.createdAt) || Date.now(),
        updatedAt: Number(entry?.updatedAt) || Date.now()
      }))
      .filter((entry) => entry.backendKey && entry.displayName)
  } catch {
    return []
  }
}

async function writeRegistry(
  db: SQLiteDatabase,
  userId: number,
  devices: RegisteredDevice[],
  updatedAt = Date.now()
) {
  await ensureTable(db)

  const value = JSON.stringify(devices)

  await db.runAsync(
    `
    INSERT INTO settings (user_id, key, value, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, key)
    DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
    `,
    [userId, DEVICE_REGISTRY_KEY(userId), value, updatedAt]
  )

  await markSyncDirty(db, userId, updatedAt)
}

async function readAllowedKeys(
  db: SQLiteDatabase,
  userId: number
): Promise<string[] | null> {
  await ensureTable(db)

  const row = await db.getFirstAsync<{
    value: string | null
  }>(
    `
    SELECT value
    FROM settings
    WHERE user_id = ?
      AND key = ?
    LIMIT 1
    `,
    [userId, ALLOWED_DEVICE_KEYS(userId)]
  )

  if (!row) {
    return null
  }

  if (!row.value) {
    return []
  }

  try {
    const parsed = JSON.parse(row.value)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

async function writeAllowedKeys(
  db: SQLiteDatabase,
  userId: number,
  backendKeys: string[] | null,
  updatedAt = Date.now()
) {
  await ensureTable(db)

  if (backendKeys == null) {
    await db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = ?
        AND key = ?
      `,
      [userId, ALLOWED_DEVICE_KEYS(userId)]
    )
    await markSyncDirty(db, userId, updatedAt)
    return
  }

  const value = JSON.stringify(
    Array.from(
      new Set(
        backendKeys
          .map((item) => item.trim())
          .filter(Boolean)
      )
    )
  )

  await db.runAsync(
    `
    INSERT INTO settings (user_id, key, value, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, key)
    DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
    `,
    [userId, ALLOWED_DEVICE_KEYS(userId), value, updatedAt]
  )

  await markSyncDirty(db, userId, updatedAt)
}

export function getDeviceScopedKey(
  baseKey: string,
  backendKey: string | null | undefined
) {
  if (!backendKey) {
    return baseKey
  }

  return `${baseKey}${DEVICE_SCOPE_SEPARATOR}${backendKey}`
}

export async function getRegisteredDevices(
  db: SQLiteDatabase,
  userId: number
): Promise<RegisteredDevice[]> {
  return readRegistry(db, userId)
}

export async function getActiveDeviceBackendKey(
  db: SQLiteDatabase,
  userId: number
): Promise<string | null> {
  await ensureTable(db)

  const row = await db.getFirstAsync<{
    value: string | null
  }>(
    `
    SELECT value
    FROM settings
    WHERE user_id = ?
      AND key = ?
    LIMIT 1
    `,
    [userId, ACTIVE_DEVICE_KEY(userId)]
  )

  if (row?.value) {
    const devices = await readRegistry(db, userId)
    const allowedKeys = await readAllowedKeys(db, userId)
    const visibleKeys =
      allowedKeys == null
        ? devices.map((device) => device.backendKey)
        : allowedKeys
    if (
      devices.some(
        (device) =>
          device.backendKey === row.value &&
          visibleKeys.includes(device.backendKey)
      )
    ) {
      return row.value
    }
  }

  const devices = await readRegistry(db, userId)
  const allowedKeys = await readAllowedKeys(db, userId)
  const visibleKeys =
    allowedKeys == null
      ? devices.map((device) => device.backendKey)
      : allowedKeys

  return (
    devices.find((device) =>
      visibleKeys.includes(device.backendKey)
    )?.backendKey ?? null
  )
}

export async function setActiveDeviceBackendKey(
  db: SQLiteDatabase,
  userId: number,
  backendKey: string | null
): Promise<void> {
  await ensureTable(db)

  await db.runAsync(
    `
    INSERT INTO settings (user_id, key, value, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, key)
    DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
    `,
    [
      userId,
      ACTIVE_DEVICE_KEY(userId),
      backendKey,
      Date.now()
    ]
  )
}

export async function addRegisteredDevice(
  db: SQLiteDatabase,
  userId: number,
  displayName: string
): Promise<RegisteredDevice> {
  const trimmed = displayName.trim()

  if (!trimmed) {
    throw new Error("Device name is required.")
  }

  const devices = await readRegistry(db, userId)
  const normalized = normalizeDisplayName(trimmed)

  if (
    devices.some(
      (device) =>
        normalizeDisplayName(device.displayName) ===
        normalized
    )
  ) {
    throw new Error(
      "A device with this display name already exists."
    )
  }

  const nextDevice: RegisteredDevice = {
    backendKey: generateBackendKey(),
    displayName: trimmed,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  await writeRegistry(
    db,
    userId,
    [...devices, nextDevice],
    nextDevice.updatedAt
  )

  const allowedKeys = await readAllowedKeys(db, userId)
  if (allowedKeys != null) {
    await writeAllowedKeys(
      db,
      userId,
      [...allowedKeys, nextDevice.backendKey],
      nextDevice.updatedAt
    )
  }

  const activeKey = await getActiveDeviceBackendKey(
    db,
    userId
  )

  if (!activeKey) {
    await setActiveDeviceBackendKey(
      db,
      userId,
      nextDevice.backendKey
    )
  }

  return nextDevice
}

export async function renameRegisteredDevice(
  db: SQLiteDatabase,
  userId: number,
  backendKey: string,
  displayName: string
): Promise<void> {
  const trimmed = displayName.trim()

  if (!trimmed) {
    throw new Error("Device name is required.")
  }

  const devices = await readRegistry(db, userId)
  const normalized = normalizeDisplayName(trimmed)

  if (
    devices.some(
      (device) =>
        device.backendKey !== backendKey &&
        normalizeDisplayName(device.displayName) ===
          normalized
    )
  ) {
    throw new Error(
      "A device with this display name already exists."
    )
  }

  const nextDevices = devices.map((device) =>
    device.backendKey === backendKey
      ? {
          ...device,
          displayName: trimmed,
          updatedAt: Date.now()
        }
      : device
  )

  await writeRegistry(db, userId, nextDevices)
}

export async function deleteRegisteredDevice(
  db: SQLiteDatabase,
  userId: number,
  backendKey: string
): Promise<void> {
  await clearDeviceScopedSettings(
    db,
    userId,
    backendKey
  )

  const devices = await readRegistry(db, userId)
  const nextDevices = devices.filter(
    (device) => device.backendKey !== backendKey
  )

  await writeRegistry(db, userId, nextDevices)

  const allowedKeys = await readAllowedKeys(db, userId)
  if (allowedKeys != null) {
    await writeAllowedKeys(
      db,
      userId,
      allowedKeys.filter((key) => key !== backendKey)
    )
  }

  const activeKey = await getActiveDeviceBackendKey(
    db,
    userId
  )

  if (activeKey === backendKey) {
    await setActiveDeviceBackendKey(
      db,
      userId,
      nextDevices[0]?.backendKey ?? null
    )
  }
}

export async function getAllowedDeviceBackendKeys(
  db: SQLiteDatabase,
  userId: number
): Promise<string[] | null> {
  return readAllowedKeys(db, userId)
}

export async function setAllowedDeviceBackendKeys(
  db: SQLiteDatabase,
  userId: number,
  backendKeys: string[] | null
): Promise<void> {
  await writeAllowedKeys(db, userId, backendKeys)
}

export async function toggleAllowedDeviceBackendKey(
  db: SQLiteDatabase,
  userId: number,
  backendKey: string
): Promise<void> {
  const devices = await readRegistry(db, userId)
  const allowedKeys = await readAllowedKeys(db, userId)
  const currentVisibleKeys =
    allowedKeys == null
      ? devices.map((device) => device.backendKey)
      : allowedKeys
  const nextVisibleKeys = currentVisibleKeys.includes(
    backendKey
  )
    ? currentVisibleKeys.filter(
        (key) => key !== backendKey
      )
    : [...currentVisibleKeys, backendKey]

  await writeAllowedKeys(db, userId, nextVisibleKeys)

  const activeKey = await getActiveDeviceBackendKey(
    db,
    userId
  )

  if (!activeKey || !nextVisibleKeys.includes(activeKey)) {
    await setActiveDeviceBackendKey(
      db,
      userId,
      nextVisibleKeys[0] ?? null
    )
  }
}

export async function clearDeviceScopedSettings(
  db: SQLiteDatabase,
  userId: number,
  backendKey: string
): Promise<void> {
  await ensureTable(db)

  const suffix = `${DEVICE_SCOPE_SEPARATOR}${backendKey}`
  const rows = await db.getAllAsync<{
    key: string
  }>(
    `
    SELECT key
    FROM settings
    WHERE user_id = ?
      AND substr(key, -length(?)) = ?
    `,
    [userId, suffix, suffix]
  )

  for (const row of rows) {
    await db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = ?
        AND key = ?
      `,
      [userId, row.key]
    )
  }

  await markSyncDirty(db, userId, Date.now())
}
