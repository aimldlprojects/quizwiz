// controllers/practiceController.ts

import { ReviewRepository } from "../database/reviewRepository"
import { PracticeSession } from "../engine/practice/practiceSession"
import { QuestionQueue } from "../engine/practice/questionQueue"
import { ReviewScheduler } from "../engine/scheduler/reviewScheduler"
import { ReviewRating } from "../engine/scheduler/spacedRepetition"
import { SyncService } from "../services/syncService"

export class PracticeController {

  private session: PracticeSession
  private scheduler: ReviewScheduler
  private queue: QuestionQueue
  private repo: ReviewRepository
  private syncService: SyncService

  private userId: number

  constructor(
    userId: number,
    scheduler: ReviewScheduler,
    queue: QuestionQueue,
    repo: ReviewRepository
  ) {

    this.userId = userId
    this.scheduler = scheduler
    this.queue = queue
    this.repo = repo
    this.syncService = new SyncService(repo["db"])
    this.session = new PracticeSession(this.scheduler, this.syncService)
  }

  // ---------- start practice ----------

  async startPractice() {

    await this.queue.init()

    const question = await this.queue.getNextQuestion()

    return question
  }

  // ---------- get current question ----------

  getCurrentQuestion() {
    return this.session.getCurrentQuestion()
  }

  // ---------- next question ----------

  async nextQuestion() {

    const q = await this.queue.getNextQuestion()

    if (!q) return null

    return q
  }

  // ---------- submit answer ----------

  async submitAnswer(
    userAnswer: string,
    rating: ReviewRating
  ) {

    const result =
      await this.session.submitAnswer(userAnswer, rating)

    if (!result) return null

    const current = this.session.getCurrentQuestion()

    if (!current) return result

    await this.repo.saveReview({
      user_id: this.userId,
      question_id: current.id,
      repetition: result.review.repetition,
      interval: result.review.interval,
      ease_factor: result.review.ease_factor,
      next_review: result.review.next_review,
      last_result: rating
    })

    return result
  }

  // ---------- stats ----------

  getStats() {
    return this.session.getStats()
  }

  getAccuracy() {
    return this.session.getAccuracy()
  }

  // ---------- reset ----------

  resetSession() {
    this.session.resetSession()
  }

}