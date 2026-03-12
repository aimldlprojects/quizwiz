import { ReviewRepository } from "../database/reviewRepository"
import { EventBus } from "../engine/events/eventBus"
import { Events } from "../engine/events/events"
import { LearningSessionManager } from "../engine/practice/learningSessionManager"
import { PracticeSession } from "../engine/practice/practiceSession"
import { QuestionQueue } from "../engine/practice/questionQueue"
import { ReviewScheduler } from "../engine/scheduler/reviewScheduler"
import { ReviewRating } from "../engine/scheduler/spacedRepetition"
import { SessionCache } from "../engine/sessionCache"
import { registerBackupListener } from "../services/events/backupListener"
import { SyncService } from "../services/syncService"

export class PracticeController {

  private session: PracticeSession
  private scheduler: ReviewScheduler
  private queue: QuestionQueue
  private repo: ReviewRepository
  private syncService: SyncService
  private eventBus = new EventBus()
  private userId: number
  private sessionManager: LearningSessionManager
  private sessionCache = new SessionCache<any>()

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

    this.syncService = new SyncService(repo.getDB())

    this.session = new PracticeSession(
      this.userId,
      this.scheduler,
      this.syncService
    )

    this.sessionManager = new LearningSessionManager(queue)

    this.eventBus.on(
      Events.ANSWER_SUBMITTED,
      () => {
        this.prefetchQuestions()
      }
    )

    registerBackupListener(
      this.eventBus,
      this.syncService
    )

  }

  /*
  --------------------------------------------------
  Start Practice
  --------------------------------------------------
  */

  async startPractice() {

    const question =
      await this.sessionManager.startSession()

    return question

  }

  /*
  --------------------------------------------------
  Current Question
  --------------------------------------------------
  */

  getCurrentQuestion() {

    return this.session.getCurrentQuestion()

  }

  /*
  --------------------------------------------------
  Next Question
  --------------------------------------------------
  */

  async nextQuestion() {

    const q =
      await this.sessionManager.nextQuestion()

    if (!q) return null

    return q

  }

  /*
  --------------------------------------------------
  Prefetch Questions
  --------------------------------------------------
  */

  private async prefetchQuestions() {

    if (this.sessionCache.remaining() > 5) return

    const newQuestions: any[] = []

    for (let i = 0; i < 10; i++) {

      const q = await this.queue.getNextQuestion()

      if (!q) break

      newQuestions.push(q)

    }

    if (newQuestions.length > 0) {

      const currentRemaining: any[] = []

      let q = this.sessionCache.next()

      while (q) {
        currentRemaining.push(q)
        q = this.sessionCache.next()
      }

      this.sessionCache.load([
        ...currentRemaining,
        ...newQuestions
      ])

    }

  }

  /*
  --------------------------------------------------
  Submit Answer
  --------------------------------------------------
  */

  async submitAnswer(
    userAnswer: string,
    rating: ReviewRating
  ) {

    const result =
      await this.session.submitAnswer(userAnswer, rating)

    if (!result) return null

    const current = this.session.getCurrentQuestion()

    if (!current) return result

    await this.repo.saveReview(result.review)

    this.eventBus.emit(
      Events.ANSWER_SUBMITTED,
      {
        questionId: current.id,
        rating
      }
    )

    this.triggerBackgroundSync()

    return result

  }

  /*
  --------------------------------------------------
  Background Sync
  --------------------------------------------------
  */

  private triggerBackgroundSync() {

    try {

      this.syncService.sync()

    } catch (err) {

      console.log("Background sync failed:", err)

    }

  }

  /*
  --------------------------------------------------
  Remaining Cards
  --------------------------------------------------
  */

  getRemainingCards() {

    return this.sessionManager.getRemaining()

  }

  /*
  --------------------------------------------------
  Stats
  --------------------------------------------------
  */

  getStats() {

    return this.session.getStats()

  }

  getAccuracy() {

    return this.session.getAccuracy()

  }

  /*
  --------------------------------------------------
  Reset Session
  --------------------------------------------------
  */

  resetSession() {

    this.session.resetSession()

  }

}