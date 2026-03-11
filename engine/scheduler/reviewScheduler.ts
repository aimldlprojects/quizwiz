// engine/scheduler/reviewScheduler.ts

import { calculateNextReview, ReviewRating } from "./spacedRepetition"

export interface Question {
  id: number
  question: string
  answer: string
}

export interface ReviewRecord {
  question_id: number
  repetition: number
  interval: number
  ease_factor: number
  next_review: number
  last_result?: string
}

export interface SchedulerData {
  questions: Question[]
  reviews: ReviewRecord[]
}

export class ReviewScheduler {

  private questions: Question[]
  private reviews: ReviewRecord[]

  constructor(data: SchedulerData) {
    this.questions = data.questions
    this.reviews = data.reviews
  }

  // ---------- helper maps ----------

  private reviewMap(): Map<number, ReviewRecord> {
    const map = new Map<number, ReviewRecord>()

    for (const r of this.reviews) {
      map.set(r.question_id, r)
    }

    return map
  }

  // ---------- queues ----------

  getDueReviews(): Question[] {

    const now = Date.now()

    const reviewMap = this.reviewMap()

    return this.questions.filter(q => {
      const review = reviewMap.get(q.id)
      return review && review.next_review <= now
    })
  }

  getFailedQuestions(): Question[] {

    const reviewMap = this.reviewMap()

    return this.questions.filter(q => {
      const review = reviewMap.get(q.id)
      return review && review.last_result === "again"
    })
  }

  getNewQuestions(): Question[] {

    const reviewMap = this.reviewMap()

    return this.questions.filter(q => !reviewMap.has(q.id))
  }

  // ---------- next question selection ----------

  getNextQuestion(): Question | null {

    const due = this.getDueReviews()
    if (due.length > 0) return due[0]

    const failed = this.getFailedQuestions()
    if (failed.length > 0) return failed[0]

    const fresh = this.getNewQuestions()
    if (fresh.length > 0) return fresh[0]

    return null
  }

  // ---------- update review state ----------

  updateReview(
    questionId: number,
    rating: ReviewRating
  ): ReviewRecord {

    const existing = this.reviews.find(
      r => r.question_id === questionId
    )

    const state = existing
      ? {
          repetition: existing.repetition,
          interval: existing.interval,
          easeFactor: existing.ease_factor
        }
      : {
          repetition: 0,
          interval: 0,
          easeFactor: 2.5
        }

    const result = calculateNextReview(state, rating)

    const review: ReviewRecord = {
      question_id: questionId,
      repetition: result.repetition,
      interval: result.interval,
      ease_factor: result.easeFactor,
      next_review: result.nextReview,
      last_result: rating
    }

    if (existing) {
      Object.assign(existing, review)
    } else {
      this.reviews.push(review)
    }

    return review
  }

}