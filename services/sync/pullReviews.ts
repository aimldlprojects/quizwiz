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

export async function pullReviews(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number
): Promise<void> {

  const lastSync = await getLastSyncRev(db)

  const res = await fetch(
    `${serverUrl}/reviews/changes?user_id=${userId}&since=${lastSync}`
  )

  if (!res.ok) {
    throw new Error(`Failed to pull reviews: ${res.status}`)
  }

  const data: {
    changes: Array<{
      user_id: number
      question_id: number
      repetition: number
      interval: number
      ease_factor: number
      next_review: number
      last_result: string
      rev_id: number
    }>
  } = await res.json()

  if (!data?.changes?.length) {
    return
  }

  const repo = new ReviewRepository(db)

  let maxRev = lastSync

  for (const r of data.changes) {

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
    await setLastSyncRev(db, maxRev)
  }

}