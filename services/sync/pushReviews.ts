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

  return await db.getAllAsync(
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

}


/*
--------------------------------------------------
Push Reviews To Server
--------------------------------------------------
*/

export async function pushReviews(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number
): Promise<void> {

  const lastSync = await getLastSyncRev(db)

  const changes = await getLocalReviewChanges(
    db,
    userId,
    lastSync
  )

  if (!changes || changes.length === 0) {
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
        changes
      })
    }
  )

  if (!res.ok) {
    throw new Error(`Push reviews failed: ${res.status}`)
  }

  const data = await res.json()

  if (data?.max_rev) {
    await db.runAsync(
      `
      INSERT INTO sync_meta (key, value)
      VALUES ('reviews_last_rev', ?)
      ON CONFLICT(key)
      DO UPDATE SET value = excluded.value
      `,
      [data.max_rev]
    )
  }

}