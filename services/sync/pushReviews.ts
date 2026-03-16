import { SQLiteDatabase } from "expo-sqlite"
import {
  getLastPushRev,
  setLastPushRev,
  setSyncStatus,
} from "../../database/syncMetaRepository"
import {
  logSyncConsole,
  logSyncDebug
} from "@/config/logging"
import { syncConfig } from "@/config/sync"

const CHUNK_SIZE = syncConfig.pushChunkSize

/*
--------------------------------------------------
Get Local Review Changes
--------------------------------------------------
*/

async function getLocalReviewChanges(
  db: SQLiteDatabase,
  userId: number,
  lastSync: number,
  limit: number
) {

  const rows = await db.getAllAsync(
    `
    SELECT
      user_id,
      question_id,
      repetition,
      interval,
      ease_factor,
      next_review,
      last_result,
      rev_id,
      last_modified_rev,
      sync_version,
      updated_at
    FROM reviews
    WHERE user_id = ?
      AND rev_id > ?
    ORDER BY rev_id ASC
    LIMIT ?
    `,
    [userId, lastSync, limit]
  )

  return rows.map((row: any) => ({
    ...row,
    question_id: normalizeQuestionId(
      row.question_id
    )
  }))

}

function normalizeQuestionId(
  questionId: unknown
) {

  if (typeof questionId === "number") {
    return questionId
  }

  const raw = String(questionId)

  const match =
    raw.match(/^tables_(\d+)_(\d+)$/)

  if (match) {
    return Number(`${match[1]}${match[2]}`)
  }

  const numeric = Number(raw)

  return Number.isNaN(numeric) ? 0 : numeric

}

/*
--------------------------------------------------
Push Reviews To Server
--------------------------------------------------
*/

async function getStats(
  db: SQLiteDatabase,
  userId: number
) {
  return await db.getAllAsync<{
    id: number
    user_id: number
    question_id: number | null
    correct: number
    wrong: number
    practiced_at: number | string | null
    updated_at: number | string | null
  }>(
    `
    SELECT
      id,
      user_id,
      question_id,
      correct,
      wrong,
      practiced_at,
      updated_at
    FROM stats
    WHERE user_id = ?
    `,
    [userId]
  )
}

async function getUserBadges(
  db: SQLiteDatabase,
  userId: number
) {
  return await db.getAllAsync<{
    user_id: number
    badge_id: string
    unlocked_at: number | string | null
    updated_at: number | string | null
  }>(
    `
    SELECT
      user_id,
      badge_id,
      unlockedAt AS unlocked_at,
      updated_at
    FROM user_badges
    WHERE user_id = ?
    `,
    [userId]
  )
}

async function getSettings(
  db: SQLiteDatabase,
  userId: number
) {
  return await db.getAllAsync<{
    user_id: number
    key: string
    value: string
    updated_at: number | string | null
  }>(
    `
    SELECT
      user_id,
      key,
      value,
      updated_at
    FROM settings
    WHERE user_id = ?
    `,
    [userId]
  )
}

async function getSettingsForSync(
  db: SQLiteDatabase,
  userId: number
) {
  const rows = await getSettings(db, userId)

  return rows.filter((row) => row.user_id === userId)
}

function hasMeta(
  stats: unknown[],
  settings: unknown[],
  badges: unknown[]
) {
  return (
    stats.length > 0 ||
    settings.length > 0 ||
    badges.length > 0
  )
}

export async function pushReviews(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number
): Promise<void> {

  const lastSync = await getLastPushRev(db, userId)

  const stats = await getStats(db, userId)
  const settings = await getSettingsForSync(
    db,
    userId
  )
  const badges = await getUserBadges(db, userId)

  logSyncConsole(
    `pushReviews start for user ${userId}, lastSync=${lastSync}, stats=${stats.length}, badges=${badges.length}, settings=${settings.length}`
  )

  const includeMeta = hasMeta(
    stats,
    settings,
    badges
  )

  if (!includeMeta && lastSync > 0) {
    const pending = await getLocalReviewChanges(
      db,
      userId,
      lastSync,
      1
    )

    if (pending.length === 0) {
      return
    }
  }

  let finalRev = lastSync
  let firstRequest = true

  try {
    while (true) {
      const changes = await getLocalReviewChanges(
        db,
        userId,
        finalRev,
        CHUNK_SIZE
      )

      logSyncConsole(
        `pushReviews chunk for ${userId}: changes=${changes.length}, includeMeta=${includeMeta}, finalRev=${finalRev}`
      )

      const hasChanges = changes.length > 0

      logSyncDebug(
        `pushReviews chunk for ${userId} since ${finalRev}, changes=${changes.length}`
      )

      if (!hasChanges && !firstRequest && !includeMeta) {
        break
      }

      if (!hasChanges && firstRequest && !includeMeta) {
        break
      }

      const payload: Record<string, unknown> = {
        user_id: userId,
        reviews: changes
      }

      if (includeMeta && firstRequest) {
        payload.stats = stats
        payload.settings = settings
        payload.user_badges = badges
      }

      logSyncDebug(
        `pushReviews: POST ${serverUrl}/reviews/push chunk`
      )
      const res = await fetch(
        `${serverUrl}/reviews/push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      )

      if (!res.ok) {
        const body = await res.text()
        throw new Error(
          `Push reviews failed: ${res.status} ${body}`
        )
      }

      const data = await res.json()
      const serverMax =
        typeof data?.max_rev === "number"
          ? data.max_rev
          : finalRev

      finalRev = Math.max(finalRev, serverMax)

      logSyncConsole(
        `pushReviews chunk completed for ${userId}, server_max=${serverMax}, new finalRev=${finalRev}`
      )

      if (!hasChanges) {
        break
      }

      if (changes.length < CHUNK_SIZE) {
        break
      }

      firstRequest = false
    }
  } catch (err) {
    await setSyncStatus(
      db,
      userId,
      "failed",
      Date.now(),
      err instanceof Error ? err.message : String(err)
    )
    throw err
  }

  logSyncDebug(
    `pushReviews: finished for ${userId}, finalRev=${finalRev}`
  )
  logSyncConsole(
    `pushReviews finished for ${userId}, finalRev=${finalRev}`
  )
  await setLastPushRev(db, userId, finalRev)
  await setSyncStatus(db, userId, "success", Date.now())

}
