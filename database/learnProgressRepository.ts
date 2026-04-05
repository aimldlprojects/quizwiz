import { SQLiteDatabase } from "expo-sqlite"

import { markSyncDirty } from "./syncMetaRepository"
import { getDeviceScopedKey } from "./deviceRegistryRepository"

export interface LearnProgressRecord {
  topicId: number
  cardId: number | null
  cardIndex: number
  totalCards: number
  updatedAt: number
}

function getLearnProgressKey(topicId: number) {
  return `learn_progress_topic_${topicId}`
}

function getScopedLearnProgressKey(
  topicId: number,
  deviceKey?: string | null
) {
  return getDeviceScopedKey(
    getLearnProgressKey(topicId),
    deviceKey
  )
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

export async function getLearnProgress(
  db: SQLiteDatabase,
  userId: number,
  topicId: number,
  deviceKey?: string | null
): Promise<LearnProgressRecord | null> {

  await ensureTable(db)

  const scopedKey =
    getScopedLearnProgressKey(topicId, deviceKey)
  const legacyKey = getLearnProgressKey(topicId)
  const row = await db.getFirstAsync<{
    value: string
    updated_at: number | null
  }>(
    `
    SELECT value, updated_at
    FROM settings
    WHERE user_id = ?
      AND key = ?
    LIMIT 1
    `,
    [userId, scopedKey]
  )

  const fallbackRow =
    !row && scopedKey !== legacyKey
      ? await db.getFirstAsync<{
          value: string
          updated_at: number | null
        }>(
          `
          SELECT value, updated_at
          FROM settings
          WHERE user_id = ?
            AND key = ?
          LIMIT 1
          `,
          [userId, legacyKey]
        )
      : null

  const sourceRow = row ?? fallbackRow

  if (!sourceRow?.value) {
    return null
  }

  try {
    const parsed = JSON.parse(sourceRow.value) as
      | Partial<LearnProgressRecord>
      | null

    if (!parsed) {
      return null
    }

    return {
      topicId,
      cardId:
        typeof parsed.cardId === "number"
          ? parsed.cardId
          : null,
      cardIndex:
        typeof parsed.cardIndex === "number"
          ? parsed.cardIndex
          : 0,
      totalCards:
        typeof parsed.totalCards === "number"
          ? parsed.totalCards
          : 0,
      updatedAt:
        typeof sourceRow.updated_at === "number"
          ? sourceRow.updated_at
          : Number(parsed.updatedAt) || Date.now()
    }
  } catch {
    return null
  }

}

export async function setLearnProgress(
  db: SQLiteDatabase,
  userId: number,
  progress: Omit<
    LearnProgressRecord,
    "updatedAt"
  > & {
    updatedAt?: number
    deviceKey?: string | null
  }
): Promise<void> {

  await ensureTable(db)

  const updatedAt =
    progress.updatedAt ?? Date.now()
  const key =
    getScopedLearnProgressKey(
      progress.topicId,
      progress.deviceKey
    )

  const current = await db.getFirstAsync<{
    updated_at: number | null
    value: string | null
  }>(
    `
    SELECT updated_at, value
    FROM settings
    WHERE user_id = ?
      AND key = ?
    LIMIT 1
    `,
    [userId, key]
  )

  if (
    current?.updated_at != null &&
    updatedAt < current.updated_at
  ) {
    return
  }

  const value = JSON.stringify({
    topicId: progress.topicId,
    cardId: progress.cardId,
    cardIndex: progress.cardIndex,
    totalCards: progress.totalCards,
    updatedAt
  })

  if (current?.value === value) {
    return
  }

  if (current) {
    await db.runAsync(
      `
      UPDATE settings
      SET value = ?,
          updated_at = ?
      WHERE user_id = ?
        AND key = ?
      `,
      [value, updatedAt, userId, key]
    )
  } else {
    await db.runAsync(
      `
      INSERT INTO settings
      (user_id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
      `,
      [userId, key, value, updatedAt]
    )
  }

  await markSyncDirty(db, userId, updatedAt)

}

export async function clearLearnProgressForUser(
  db: SQLiteDatabase,
  userId: number,
  deviceKey?: string | null
): Promise<void> {

  await ensureTable(db)

  if (deviceKey) {
    const suffix = `__device_${deviceKey}`
    await db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = ?
        AND substr(key, -length(?)) = ?
      `,
      [userId, suffix, suffix]
    )
    return
  }

  await db.runAsync(
    `
    DELETE FROM settings
    WHERE user_id = ?
      AND key LIKE 'learn_progress_topic_%'
    `,
    [userId]
  )

}

