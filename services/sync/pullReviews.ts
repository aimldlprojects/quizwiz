import { SQLiteDatabase } from "expo-sqlite"

import {
  getLastSyncRev,
  setLastSyncRev
} from "../../database/syncMetaRepository"

import { Review } from "@/domain/entities/review"
import { ReviewRepository } from "../../database/reviewRepository"

/*
--------------------------------------------------
Pull Reviews From Server
--------------------------------------------------
*/

async function replaceStats(
  db: SQLiteDatabase,
  userId: number,
  stats: Array<{
    id?: number
    user_id: number
    correct: number
    wrong: number
    practiced_at?: number | string | null
  }>
) {
  if (stats == null) {
    return
  }

  await db.runAsync(
    `
    DELETE FROM stats
    WHERE user_id = ?
    `,
    [userId]
  )

  for (const row of stats) {
    await db.runAsync(
      `
      INSERT INTO stats
      (id, user_id, correct, wrong, practiced_at)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        row.id ?? null,
        row.user_id,
        row.correct,
        row.wrong,
        row.practiced_at ?? Date.now()
      ]
    )
  }

}

async function replaceUserBadges(
  db: SQLiteDatabase,
  userId: number,
  badges: Array<{
    user_id: number
    badge_id: string
    unlocked_at?: number | string | null
  }>
) {
  if (badges == null) {
    return
  }

  await db.runAsync(
    `
    DELETE FROM user_badges
    WHERE user_id = ?
    `,
    [userId]
  )

  for (const row of badges) {
    await db.runAsync(
      `
      INSERT INTO user_badges
      (user_id, badge_id, unlocked_at)
      VALUES (?, ?, ?)
      `,
      [
        row.user_id,
        row.badge_id,
        row.unlocked_at ?? Date.now()
      ]
    )
  }

}

async function replaceSettings(
  db: SQLiteDatabase,
  entries: Array<{
    key: string
    value: string
  }>
) {
  if (entries == null) {
    return
  }

  await db.runAsync(
    `
    DELETE FROM settings
    `
  )

  for (const entry of entries) {
    await db.runAsync(
      `
      INSERT INTO settings
      (key, value)
      VALUES (?, ?)
      `,
      [entry.key, entry.value]
    )
  }

}

export async function pullReviews(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number
): Promise<void> {

  const lastSync = await getLastSyncRev(
    db,
    userId
  )

  const res = await fetch(
    `${serverUrl}/reviews/changes?user_id=${userId}&since=${lastSync}`
  )

  if (!res.ok) {
    throw new Error(`Failed to pull reviews: ${res.status}`)
  }

  const data = await res.json()

  const reviews =
    data?.reviews ?? data?.changes ?? []

  const repo = new ReviewRepository(db)

  let maxRev = lastSync

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

    if (r.rev_id > maxRev) {
      maxRev = r.rev_id
    }

  }

  if (maxRev > lastSync) {
    await setLastSyncRev(
      db,
      userId,
      maxRev
    )
  }

  await replaceStats(db, userId, data?.stats ?? [])
  await replaceUserBadges(
    db,
    userId,
    data?.user_badges ?? []
  )
  await replaceSettings(db, data?.settings ?? [])

}
