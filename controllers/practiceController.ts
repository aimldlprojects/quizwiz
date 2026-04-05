import { ReviewRepository } from "../database/reviewRepository"
import { StatsRepository } from "../database/statsRepository"
import { EventBus } from "../engine/events/eventBus"
import { Events } from "../engine/events/events"
import { LearningSessionManager } from "../engine/practice/learningSessionManager"
import { PracticeSession } from "../engine/practice/practiceSession"
import { QuestionQueue } from "../engine/practice/questionQueue"
import { ReviewScheduler } from "../engine/scheduler/reviewScheduler"
import { ReviewRating } from "../engine/scheduler/spacedRepetition"
import { SessionCache } from "../engine/sessionCache"
import { registerAchievementListener } from "../services/events/achievementListener"
import { SyncService } from "../services/syncService"
import {
  clearPracticeSession,
  getPracticeSession,
  setPracticeSession
} from "../database/practiceSessionRepository"
export class PracticeController {

  private session: PracticeSession
  private scheduler: ReviewScheduler
  private queue: QuestionQueue
  private repo: ReviewRepository
  private syncService: SyncService
  private statsRepo: StatsRepository
  private eventBus = new EventBus()
  private userId: number
  private topicId: number | null
  private deviceKey: string | null
  private sessionManager: LearningSessionManager
  private sessionCache = new SessionCache<any>()
  private shuffleRemainingSession: boolean

  constructor(
    userId: number,
    scheduler: ReviewScheduler,
    queue: QuestionQueue,
    repo: ReviewRepository,
    topicId: number | null = null,
    deviceKey: string | null = null,
    shuffleRemainingSession: boolean = false
  ) {

    this.userId = userId
    this.topicId = topicId
    this.deviceKey = deviceKey
    this.scheduler = scheduler
    this.queue = queue
    this.repo = repo
    this.shuffleRemainingSession = shuffleRemainingSession
    this.statsRepo = new StatsRepository(
      repo.getDB()
    )

    this.syncService = new SyncService(
      repo.getDB(),
      this.userId
    )

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

    registerAchievementListener(
      this.eventBus,
      this.repo.getDB(),
      this.userId
    )
  }

  /*
  --------------------------------------------------
  Start Practice
  --------------------------------------------------
  */

  async startPractice() {

    await this.restoreSessionState()

    if (this.shuffleRemainingSession) {
      this.shuffleRemainingCards()
    }

    const question =
      await this.sessionManager.startSession()

    this.session.setCurrentQuestion(
      question
    )

    await this.saveSessionState()

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

    this.session.setCurrentQuestion(q)

    if (!q) {
      await this.clearSessionState()
      return null
    }

    await this.saveSessionState()

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

    await this.repo.ensureQuestionRecord(
      current,
      this.topicId
    )
    await this.repo.saveReview(result.review)
    await this.statsRepo.recordAnswer(
      this.userId,
      result.correct ? 1 : 0,
      result.correct ? 0 : 1,
      current.id ?? null,
      this.topicId
    )

    this.eventBus.emit(
      Events.ANSWER_SUBMITTED,
      {
        questionId: current.id,
        rating: result.rating
      }
    )

    await this.saveSessionState()

    return result

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
    this.sessionManager.reset()
    this.queue.clear()
    this.sessionCache.clear()
    void this.clearSessionState()

  }

  shuffleRemainingCards() {
    this.sessionManager.shuffleRemaining()
    this.queue.shuffleQueue()
  }

  async snapshotSessionState() {
    return {
      practice: this.session.snapshot(),
      session: this.sessionManager.snapshot(),
      queue: this.queue.snapshot()
    }
  }

  async persistSessionState() {
    await this.saveSessionState()
  }

  async restoreSessionState() {
    if (this.topicId == null) {
      return
    }

    const saved = await getPracticeSession(
      this.repo.getDB(),
      this.userId,
      this.topicId,
      this.deviceKey
    )

    if (!saved) {
      return
    }

    const sessionSnapshot =
      saved.state.session
    const queueSnapshot =
      saved.state.queue
    const practiceSnapshot =
      saved.state.practice

    if (
      !sessionSnapshot?.items?.length ||
      !queueSnapshot ||
      !practiceSnapshot
    ) {
      return
    }

    this.queue.restore(queueSnapshot)

    this.session.restore(practiceSnapshot)

    this.sessionManager.restore({
      items: sessionSnapshot.items,
      index: Math.max(
        0,
        Math.min(
          sessionSnapshot.index - 1,
          sessionSnapshot.items.length - 1
        )
      )
    })

  }

  private async saveSessionState() {
    if (this.topicId == null) {
      return
    }

    const snapshot =
      await this.snapshotSessionState()

    if (snapshot.session.items.length === 0) {
      await clearPracticeSession(
        this.repo.getDB(),
        this.userId,
        this.topicId,
        this.deviceKey
      )
      return
    }

    await setPracticeSession(
      this.repo.getDB(),
      this.userId,
      this.topicId,
      snapshot,
      this.deviceKey
    )
  }

  private async clearSessionState() {
    if (this.topicId == null) {
      return
    }

    await clearPracticeSession(
      this.repo.getDB(),
      this.userId,
      this.topicId,
      this.deviceKey
    )
  }

}
