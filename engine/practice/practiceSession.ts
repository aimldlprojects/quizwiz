// engine/practice/practiceSession.ts

import { Review } from "../../domain/entities/review"
import { SyncService } from "../../services/syncService"
import { ReviewScheduler } from "../scheduler/reviewScheduler"
import { ReviewRating } from "../scheduler/spacedRepetition"
import { SchedulerReviewState } from "../scheduler/types"
export interface Question {
  id: number
  question: string
  answer: string
}

export interface SessionStats {
  attempts: number
  correct: number
}

export class PracticeSession {

  private scheduler: ReviewScheduler
  private syncService: SyncService
  private userId: number
  private currentQuestion: Question | null = null
  private stats: SessionStats = {
    attempts: 0,
    correct: 0
  }

  // -------------------------------------------------
  // Backup tracking
  // -------------------------------------------------
  private backupCounter = 0

  constructor(
    userId: number,
    scheduler: ReviewScheduler,
    syncService: SyncService
  ) {

    this.userId = userId
    this.scheduler = scheduler
    this.syncService = syncService

  }


  // ---------- start session ----------

  startSession(): Question | null {
    return this.loadNextQuestion()
  }

  // ---------- get current question ----------

  getCurrentQuestion(): Question | null {
    return this.currentQuestion
  }

  // ---------- load next question ----------

  loadNextQuestion(): Question | null {

    const next = this.scheduler.getNextQuestion()

    this.currentQuestion = next

    return next
  }
  /*
  --------------------------------------------------
  Build Domain Review Entity
  --------------------------------------------------
  */

  private buildReview(
    questionId: number,
    r: SchedulerReviewState,
    rating: ReviewRating
  ): Review {

    return new Review({

      userId: this.userId,
      questionId,

      repetition: r.repetition,
      interval: r.interval,
      easeFactor: r.easeFactor,

      nextReview: r.nextReview,
      lastResult: rating

    })

  }
  // ---------- submit answer ----------

  async submitAnswer(
    userAnswer: string,
    rating: ReviewRating
  ) {

    if (!this.currentQuestion) {
      return null
    }

    const correctAnswer = this.currentQuestion.answer

    const isCorrect =
      userAnswer.trim() === correctAnswer.trim()

    this.stats.attempts += 1

    if (isCorrect) {
      this.stats.correct += 1
    }
    // -------------------------------------------------
    // Update Review State
    // -------------------------------------------------

    const r = this.scheduler.updateReview(
      this.currentQuestion.id,
      rating
    )

    const review = this.buildReview(
      this.currentQuestion!.id,
      r,
      rating
    )

    return {
      correct: isCorrect,
      correctAnswer,
      review
    }
  }

  // ---------- session stats ----------

  getStats(): SessionStats {
    return this.stats
  }

  // ---------- accuracy ----------

  getAccuracy(): number {

    if (this.stats.attempts === 0) {
      return 0
    }

    return Math.round(
      (this.stats.correct / this.stats.attempts) * 100
    )
  }

  // ---------- reset session ----------

  resetSession() {

    this.stats = {
      attempts: 0,
      correct: 0
    }

    this.currentQuestion = null
  }

}