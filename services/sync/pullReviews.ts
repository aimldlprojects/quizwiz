import { SQLiteDatabase } from "expo-sqlite"

import {
  getLastPullRev,
  beginSyncActivity,
  endSyncActivity,
  setLastPullRev,
  setSyncStatus
} from "../../database/syncMetaRepository"

import { Review } from "@/domain/entities/review"
import { ReviewRepository } from "../../database/reviewRepository"
import { UserSubjectRepository } from "../../database/userSubjectRepository"
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
    const updatedAt =
      typeof entry.updated_at === "number"
        ? entry.updated_at
        : entry.updated_at
        ? Date.parse(String(entry.updated_at))
        : Date.now()

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
      [entry.user_id, entry.key]
    )

    if (
      current?.updated_at != null &&
      updatedAt < current.updated_at
    ) {
      continue
    }

    if (current) {
      await db.runAsync(
        `
        UPDATE settings
        SET value = ?, updated_at = ?
        WHERE user_id = ?
          AND key = ?
        `,
        [
          entry.value,
          updatedAt,
          entry.user_id,
          entry.key
        ]
      )
    } else {
      await db.runAsync(
        `
        INSERT INTO settings
        (user_id, key, value, updated_at)
        VALUES (?, ?, ?, ?)
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
}

export async function pullReviews(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number,
  options?: {
    showOverlay?: boolean
    overlayLabel?: string
  }
): Promise<void> {

  const lastPull = await getLastPullRev(
    db,
    userId
  )

  let data: any

  const controller = new AbortController()
  const timeoutMs = syncConfig.pullTimeoutMs
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  const showOverlay =
    options?.showOverlay !== false
  const overlayLabel =
    options?.overlayLabel ?? "Syncing current profile..."
  const overlayDelayMs = 150
  let overlayShown = false
  let overlayTimer: ReturnType<typeof setTimeout> | null = null

  if (showOverlay) {
    overlayTimer = setTimeout(() => {
      overlayShown = true
      beginSyncActivity(overlayLabel)
    }, overlayDelayMs)
  }

  try {
    const res = await fetch(
      `${serverUrl}/reviews/pull?user_id=${userId}&since_rev_id=${lastPull}`,
      { signal: controller.signal }
    )

    if (!res.ok) {
      throw new Error(
        `Failed to pull reviews: ${res.status}`
      )
    }

    data = await res.json()
  } catch (err) {
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
    if (overlayTimer) {
      clearTimeout(overlayTimer)
      overlayTimer = null
    }
    if (showOverlay && overlayShown) {
      endSyncActivity()
    }
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

  const permissionsRepo =
    new UserSubjectRepository(db)

  await permissionsRepo.restorePermissionSnapshots(
    userId
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
