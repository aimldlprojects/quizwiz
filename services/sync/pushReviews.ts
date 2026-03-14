import { SQLiteDatabase } from "expo-sqlite"
import { getLastSyncRev } from "../../database/syncMetaRepository"

/*
--------------------------------------------------
Get Local Review Changes
--------------------------------------------------
*/

async function getLocalReviewChanges(
  db: SQLiteDatabase,
  userId: number,
  lastSync: number
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
      rev_id
    FROM reviews
    WHERE user_id = ?
      AND rev_id > ?
    ORDER BY rev_id ASC
    `,
    [userId, lastSync]
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
    correct: number
    wrong: number
    practiced_at: number | string | null
  }>(
    `
    SELECT *
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
  }>(
    `
    SELECT *
    FROM user_badges
    WHERE user_id = ?
    `,
    [userId]
  )
}

async function getSettings(
  db: SQLiteDatabase
) {
  return await db.getAllAsync<{
    key: string
    value: string
  }>(
    `
    SELECT key, value
    FROM settings
    `
  )
}

export async function pushReviews(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number
): Promise<void> {

  const lastSync = await getLastSyncRev(
    db,
    userId
  )

  const changes = await getLocalReviewChanges(
    db,
    userId,
    lastSync
  )

  const stats = await getStats(db, userId)
  const settings = await getSettings(db)
  const badges = await getUserBadges(db, userId)

  if (
    (!changes || changes.length === 0) &&
    stats.length === 0 &&
    settings.length === 0 &&
    badges.length === 0
  ) {
    return
  }

  const res = await fetch(
    `${serverUrl}/reviews/push`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: userId,
        reviews: changes,
        stats,
        settings,
        user_badges: badges
      })
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `Push reviews failed: ${res.status} ${body}`
    )
  }

  const data = await res.json()

  if (data?.max_rev) {
    await db.runAsync(
      `
      INSERT INTO sync_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key)
      DO UPDATE SET value = excluded.value
      `,
      [`reviews_last_rev_${userId}`, data.max_rev]
    )
  }

}
