import { ReviewRepository } from "../../database/reviewRepository"

export interface Question {
  id: number
  question: string
  answer: string | number
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

  constructor(
    loader: QuestionLoader,
    batchSize: number = 10,
    reviewRepo?: ReviewRepository,
    userId?: number
  ) {
    this.loader = loader
    this.batchSize = batchSize
    this.reviewRepo = reviewRepo
    this.userId = userId
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
        const dueReviews =
          await this.reviewRepo.getDueReviews(
            this.userId,
            this.batchSize
          )

        const normalizedDueReviews =
          dueReviews.map((row: any) => ({
            id: Number(row.id),
            question: String(row.question),
            answer: row.answer
          }))

        this.queue.push(
          ...normalizedDueReviews
        )
      }

      const remaining =
        this.batchSize - this.queue.length

      if (remaining > 0) {
        const loadedQuestions =
          await this.loader.loadQuestions(
            remaining
          )

        this.queue.push(...loadedQuestions)
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

  }

}
