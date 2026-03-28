import { SQLiteDatabase } from "expo-sqlite"

import { markSyncDirty } from "./syncMetaRepository"

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
  topicId: number
): Promise<LearnProgressRecord | null> {

  await ensureTable(db)

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
    [userId, getLearnProgressKey(topicId)]
  )

  if (!row?.value) {
    return null
  }

  try {
    const parsed = JSON.parse(row.value) as
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
        typeof row.updated_at === "number"
          ? row.updated_at
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
  > & { updatedAt?: number }
): Promise<void> {

  await ensureTable(db)

  const updatedAt =
    progress.updatedAt ?? Date.now()
  const key =
    getLearnProgressKey(progress.topicId)

  const current = await db.getFirstAsync<{
    updated_at: number | null
  }>(
    `
    SELECT updated_at
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
  userId: number
): Promise<void> {

  await ensureTable(db)

  await db.runAsync(
    `
    DELETE FROM settings
    WHERE user_id = ?
      AND key LIKE 'learn_progress_topic_%'
    `,
    [userId]
  )

}

