import { SQLiteDatabase } from "expo-sqlite"

import { markSyncDirty } from "./syncMetaRepository"
import { getDeviceScopedKey } from "./deviceRegistryRepository"

type PracticeSessionSnapshot = {
  practice?: {
    stats: {
      attempts: number
      correct: number
    }
  }
  session: {
    items: {
      id: number
      question: string
      answer: string | number
      type?: string
    }[]
    index: number
  }
  queue: {
    queue: {
      id: number
      question: string
      answer: string | number
      type?: string
    }[]
    seenIds: number[]
  }
}

export interface PracticeSessionRecord {
  userId: number
  topicId: number
  state: PracticeSessionSnapshot
  updatedAt: number
}

const SETTINGS_KEY_PREFIX = "practice_session_topic_"

function getPracticeSessionKey(topicId: number) {
  return `${SETTINGS_KEY_PREFIX}${topicId}`
}

function getScopedPracticeSessionKey(
  topicId: number,
  deviceKey?: string | null
) {
  return getDeviceScopedKey(
    getPracticeSessionKey(topicId),
    deviceKey
  )
}

function isValidSnapshot(
  value: unknown
): value is PracticeSessionSnapshot {
  const snapshot = value as PracticeSessionSnapshot | null

  return Boolean(
    snapshot &&
      snapshot.practice &&
      snapshot.practice.stats &&
      typeof snapshot.practice.stats.attempts === "number" &&
      typeof snapshot.practice.stats.correct === "number" &&
      snapshot.session &&
      Array.isArray(snapshot.session.items) &&
      typeof snapshot.session.index === "number" &&
      snapshot.queue &&
      Array.isArray(snapshot.queue.queue) &&
      Array.isArray(snapshot.queue.seenIds)
  )
}

async function readLegacySession(
  db: SQLiteDatabase,
  userId: number,
  topicId: number
): Promise<PracticeSessionRecord | null> {
  const row = await db.getFirstAsync<{
    user_id: number
    topic_id: number
    state_json: string
    updated_at: number | null
  }>(
    `
    SELECT
      user_id,
      topic_id,
      state_json,
      updated_at
    FROM practice_sessions
    WHERE user_id = ?
      AND topic_id = ?
    LIMIT 1
    `,
    [userId, topicId]
  )

  if (!row?.state_json) {
    return null
  }

  try {
    const parsed =
      JSON.parse(row.state_json) as PracticeSessionSnapshot

    if (!isValidSnapshot(parsed)) {
      return null
    }

    return {
      userId: row.user_id,
      topicId: row.topic_id,
      state: parsed,
      updatedAt:
        typeof row.updated_at === "number"
          ? row.updated_at
          : Date.now()
    }
  } catch {
    return null
  }
}

async function upsertSessionSetting(
  db: SQLiteDatabase,
  userId: number,
  topicId: number,
  state: PracticeSessionSnapshot,
  updatedAt: number,
  key?: string
) {
  await db.runAsync(
    `
    INSERT INTO settings (
      user_id,
      key,
      value,
      updated_at
    )
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, key)
    DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
    `,
    [
      userId,
      key ?? getPracticeSessionKey(topicId),
      JSON.stringify(state),
      updatedAt
    ]
  )

  await markSyncDirty(db, userId, updatedAt)
}

export async function getPracticeSession(
  db: SQLiteDatabase,
  userId: number,
  topicId: number,
  deviceKey?: string | null
): Promise<PracticeSessionRecord | null> {
  const key = getScopedPracticeSessionKey(
    topicId,
    deviceKey
  )
  const legacyKey = getPracticeSessionKey(topicId)

  const row = await db.getFirstAsync<{
    user_id: number
    topic_id: number
    value: string | null
    updated_at: number | null
  }>(
    `
    SELECT
      user_id,
      0 AS topic_id,
      value,
      updated_at
    FROM settings
    WHERE user_id = ?
      AND key = ?
    LIMIT 1
    `,
    [userId, key]
  )

  const fallbackRow =
    !row && key !== legacyKey
      ? await db.getFirstAsync<{
          user_id: number
          topic_id: number
          value: string | null
          updated_at: number | null
        }>(
          `
          SELECT
            user_id,
            0 AS topic_id,
            value,
            updated_at
          FROM settings
          WHERE user_id = ?
            AND key = ?
          LIMIT 1
          `,
          [userId, legacyKey]
        )
      : null

  const sourceRow = row ?? fallbackRow

  if (sourceRow?.value) {
    try {
      const parsed =
        JSON.parse(sourceRow.value) as PracticeSessionSnapshot

      if (!isValidSnapshot(parsed)) {
        return null
      }

      return {
        userId: sourceRow.user_id,
        topicId,
        state: parsed,
        updatedAt:
          typeof sourceRow.updated_at === "number"
            ? sourceRow.updated_at
            : Date.now()
      }
    } catch {
      return null
    }
  }

  const legacy = await readLegacySession(
    db,
    userId,
    topicId
  )

  if (!legacy) {
    return null
  }

  await upsertSessionSetting(
    db,
    userId,
    topicId,
    legacy.state,
    legacy.updatedAt,
    getPracticeSessionKey(topicId)
  )

  return legacy
}

export async function setPracticeSession(
  db: SQLiteDatabase,
  userId: number,
  topicId: number,
  state: PracticeSessionSnapshot,
  deviceKey?: string | null
): Promise<void> {
  const updatedAt = Date.now()

  await upsertSessionSetting(
    db,
    userId,
    topicId,
    state,
    updatedAt,
    getScopedPracticeSessionKey(topicId, deviceKey)
  )

  await db.runAsync(
    `
    DELETE FROM practice_sessions
    WHERE user_id = ?
      AND topic_id = ?
    `,
    [userId, topicId]
  )
}

export async function clearPracticeSession(
  db: SQLiteDatabase,
  userId: number,
  topicId: number,
  deviceKey?: string | null
): Promise<void> {
  const key = getScopedPracticeSessionKey(
    topicId,
    deviceKey
  )
  const legacyKey = getPracticeSessionKey(topicId)

  await db.runAsync(
    `
    DELETE FROM settings
    WHERE user_id = ?
      AND key IN (?, ?)
    `,
    [userId, key, legacyKey]
  )

  await db.runAsync(
    `
    DELETE FROM practice_sessions
    WHERE user_id = ?
      AND topic_id = ?
    `,
    [userId, topicId]
  )

  await markSyncDirty(db, userId)
}
