import { ReviewRepository } from "../../database/reviewRepository"
import { shuffleArray } from "../questions/shuffle"

export interface Question {
  id: number
  question: string
  answer: string | number
  type?: string
}

export interface QuestionLoader {
  loadQuestions: (limit: number) => Promise<Question[]>
}

export class QuestionQueue {

  private queue: Question[] = []
  private batchSize: number
  private loader: QuestionLoader
  private reviewRepo?: ReviewRepository
  private userId?: number
  private loading: boolean = false
  private seenIds = new Set<number>()
  private dedupeWithinSession: boolean
  private shuffleWithinSession: boolean
  private topicIdsProvider?: () => Promise<number[]> | number[]

  constructor(
    loader: QuestionLoader,
    batchSize: number = 10,
    reviewRepo?: ReviewRepository,
    userId?: number,
    dedupeWithinSession: boolean = false,
    shuffleWithinSession: boolean = false,
    topicIdsProvider?: () => Promise<number[]> | number[]
  ) {
    this.loader = loader
    this.batchSize = batchSize
    this.reviewRepo = reviewRepo
    this.userId = userId
    this.dedupeWithinSession = dedupeWithinSession
    this.shuffleWithinSession = shuffleWithinSession
    this.topicIdsProvider = topicIdsProvider
  }

  /*
  --------------------------------------------------
  Initialize Queue
  --------------------------------------------------
  */

  async init(): Promise<void> {

    if (this.queue.length === 0) {
      await this.fillQueue()
    }

  }

  /*
  --------------------------------------------------
  Fill Queue
  --------------------------------------------------
  */

  private async fillQueue(): Promise<void> {

    if (this.loading) return

    this.loading = true

    try {

      if (
        this.reviewRepo &&
        this.userId !== undefined
      ) {
        const topicIds =
          this.topicIdsProvider
            ? await this.topicIdsProvider()
            : []
        const dueReviews =
          await this.reviewRepo.getDueReviews(
            this.userId,
            this.batchSize,
            topicIds
          )

        const normalizedDueReviews =
          dueReviews.map((row: any) => ({
            id: Number(row.id),
            question: String(row.question),
            answer: row.answer
          }))

        for (const question of normalizedDueReviews) {
          if (
            this.dedupeWithinSession &&
            this.seenIds.has(question.id)
          ) {
            continue
          }

          this.queue.push(question)
          if (this.dedupeWithinSession) {
            this.seenIds.add(question.id)
          }
        }
      }

      const remaining =
        this.batchSize - this.queue.length

      if (remaining > 0) {
        const loadedQuestions =
          await this.loader.loadQuestions(
            remaining
          )

        for (const question of loadedQuestions) {
          if (
            this.dedupeWithinSession &&
            this.seenIds.has(question.id)
          ) {
            continue
          }

          this.queue.push(question)
          if (this.dedupeWithinSession) {
            this.seenIds.add(question.id)
          }
        }
      }

      if (this.shuffleWithinSession) {
        this.queue = shuffleArray(this.queue)
      }

    } finally {

      this.loading = false

    }

  }

  /*
  --------------------------------------------------
  Next Question
  --------------------------------------------------
  */

  async getNextQuestion(): Promise<Question | null> {

    if (this.queue.length === 0) {
      await this.fillQueue()
    }

    const q =
      this.queue.shift() || null

    if (
      this.queue.length <
      this.batchSize / 2
    ) {

      this.fillQueue()

    }

    return q

  }

  /*
  --------------------------------------------------
  Queue Size
  --------------------------------------------------
  */

  size(): number {

    return this.queue.length

  }

  /*
  --------------------------------------------------
  Clear Queue
  --------------------------------------------------
  */

  clear(): void {

    this.queue = []
    this.seenIds.clear()
    this.loading = false

  }

  snapshot() {
    return {
      queue: [...this.queue],
      seenIds: [...this.seenIds]
    }
  }

  restore(snapshot: {
    queue: Question[]
    seenIds: number[]
  }) {
    this.queue = [...snapshot.queue]
    this.seenIds = new Set(snapshot.seenIds)
    this.loading = false
  }

  shuffleQueue() {
    if (this.queue.length < 2) {
      return
    }

    this.queue = shuffleArray(this.queue)
  }

}
