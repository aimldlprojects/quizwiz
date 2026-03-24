import { SQLiteDatabase } from "expo-sqlite"

import {
  getLastPullRev,
  setLastPullRev,
  setSyncStatus
} from "../../database/syncMetaRepository"

import { Review } from "@/domain/entities/review"
import { ReviewRepository } from "../../database/reviewRepository"
import { syncConfig } from "@/config/sync"

/*
--------------------------------------------------
Pull Reviews From Server
--------------------------------------------------
*/

async function upsertStats(
  db: SQLiteDatabase,
  entries: Array<{
    id?: number
    user_id: number
    question_id?: number | null
    correct: number
    wrong: number
    practiced_at?: number | string | null
    updated_at?: number | string | null
  }>
) {
  if (!entries || entries.length === 0) {
    return
  }

  for (const row of entries) {
    const practicedAt =
      typeof row.practiced_at === "number"
        ? row.practiced_at
        : row.practiced_at
        ? Date.parse(String(row.practiced_at))
        : Date.now()

    const updatedAt =
      typeof row.updated_at === "number"
        ? row.updated_at
        : row.updated_at
        ? Date.parse(String(row.updated_at))
        : Date.now()

    await db.runAsync(
      `
      INSERT INTO stats
      (user_id, question_id, correct, wrong, practiced_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, question_id, practiced_at)
      DO UPDATE SET
        correct = excluded.correct,
        wrong = excluded.wrong,
        updated_at = excluded.updated_at
      `,
      [
        row.user_id,
        row.question_id ?? null,
        row.correct,
        row.wrong,
        practicedAt,
        updatedAt
      ]
    )
  }

}

async function upsertUserBadges(
  db: SQLiteDatabase,
  entries: Array<{
    user_id: number
    badge_id: string
    unlocked_at?: number | string | null
    updated_at?: number | string | null
  }>
) {
  if (!entries || entries.length === 0) {
    return
  }

  for (const row of entries) {
    const unlockedAt =
      typeof row.unlocked_at === "number"
        ? row.unlocked_at
        : row.unlocked_at
        ? Date.parse(String(row.unlocked_at))
        : Date.now()

    const updatedAt =
      typeof row.updated_at === "number"
        ? row.updated_at
        : row.updated_at
        ? Date.parse(String(row.updated_at))
        : Date.now()

    await db.runAsync(
      `
      INSERT INTO user_badges
      (user_id, badge_id, unlockedAt, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, badge_id)
      DO UPDATE SET
        unlockedAt = excluded.unlockedAt,
        updated_at = excluded.updated_at
      `,
      [
        row.user_id,
        row.badge_id,
        unlockedAt,
        updatedAt
      ]
    )
  }

}

async function upsertSettings(
  db: SQLiteDatabase,
  entries: Array<{
    user_id: number
    key: string
    value: string
    updated_at?: number | string | null
  }>
) {
  if (!entries || entries.length === 0) {
    return
  }

  for (const entry of entries) {
    if (isLocalStudySelectionKey(entry.key)) {
      continue
    }

    const updatedAt =
      typeof entry.updated_at === "number"
        ? entry.updated_at
        : entry.updated_at
        ? Date.parse(String(entry.updated_at))
        : Date.now()

    await db.runAsync(
      `
      INSERT INTO settings
      (user_id, key, value, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, key)
      DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
      `,
      [
        entry.user_id,
        entry.key,
        entry.value,
        updatedAt
      ]
    )
  }

}

function isLocalStudySelectionKey(key: string) {
  return (
    key === "selected_subject_id" ||
    key === "selected_topic_id" ||
    key === "selected_subject_ids" ||
    key === "selected_topic_level1_ids" ||
    key === "selected_topic_level2_ids" ||
    key.startsWith("selected_subject_id_user_") ||
    key.startsWith("selected_topic_id_user_") ||
    key.startsWith("selected_subject_ids_user_") ||
    key.startsWith("selected_topic_level1_ids_user_") ||
    key.startsWith("selected_topic_level2_ids_user_")
  )
}

export async function pullReviews(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number
): Promise<void> {

  const lastPull = await getLastPullRev(
    db,
    userId
  )

  let data: any

  console.log(
    "[sync-debug] pullReviews start",
    { serverUrl, userId, since: lastPull }
  )

  const controller = new AbortController()
  const timeoutMs = syncConfig.pullTimeoutMs
  const timeoutId = setTimeout(() => {
    controller.abort()
    console.log(
      "[sync-debug] pullReviews fetch timeout",
      { timeoutMs }
    )
  }, timeoutMs)

  try {
    console.log(
      "[sync-debug] pullReviews fetching"
    )
    const res = await fetch(
      `${serverUrl}/reviews/pull?user_id=${userId}&since_rev_id=${lastPull}`,
      { signal: controller.signal }
    )
    console.log(
      "[sync-debug] pullReviews response received",
      { status: res.status }
    )

    if (!res.ok) {
      throw new Error(
        `Failed to pull reviews: ${res.status}`
      )
    }

    data = await res.json()
    console.log(
      "[sync-debug] pullReviews parsed json",
      { reviews: data?.reviews?.length ?? 0 }
    )
  } catch (err) {
    console.log(
      "[sync-debug] pullReviews caught error",
      err
    )
    await setSyncStatus(
      db,
      userId,
      "failed",
      Date.now(),
      err instanceof Error ? err.message : String(err)
    )
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  const reviews =
    data?.reviews ?? []

  const repo = new ReviewRepository(db)

  let maxRev = lastPull

  for (const r of reviews) {

    const review = new Review({
      userId: r.user_id,
      questionId: r.question_id,
      repetition: r.repetition,
      interval: r.interval,
      easeFactor: r.ease_factor,
      nextReview: r.next_review,
      lastResult: r.last_result
    }) as any

    review.revId = r.rev_id

    await repo.saveReview(review)

    const candidate =
      r.rev_id ?? r.last_modified_rev ?? 0

    if (candidate > maxRev) {
      maxRev = candidate
    }

  }

  await upsertStats(
    db,
    data?.stats ?? []
  )

  await upsertUserBadges(
    db,
    data?.user_badges ?? []
  )

  await upsertSettings(
    db,
    data?.settings ?? []
  )

  const finalRev =
    data?.max_rev ?? maxRev

  await setLastPullRev(
    db,
    userId,
    finalRev
  )

  const timestamp = Date.now()

  await setSyncStatus(
    db,
    userId,
    "success",
    timestamp
  )

}
