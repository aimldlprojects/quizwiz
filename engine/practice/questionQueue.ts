export interface Question {
  id: number
  question: string
  answer: string
}

export interface QuestionLoader {
  loadQuestions: (limit: number) => Promise<Question[]>
}

export class QuestionQueue {

  private queue: Question[] = []
  private batchSize: number
  private loader: QuestionLoader
  private loading: boolean = false

  constructor(loader: QuestionLoader, batchSize: number = 10) {
    this.loader = loader
    this.batchSize = batchSize
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

      const questions =
        await this.loader.loadQuestions(
          this.batchSize
        )

      this.queue.push(...questions)

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