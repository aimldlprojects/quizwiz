// engine/practice/questionQueue.ts

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

  // ---------- initialize queue ----------

  async init(): Promise<void> {

    if (this.queue.length === 0) {
      await this.fillQueue()
    }

  }

  // ---------- fill queue ----------

  private async fillQueue(): Promise<void> {

    if (this.loading) return

    this.loading = true

    const questions =
      await this.loader.loadQuestions(this.batchSize)

    this.queue.push(...questions)

    this.loading = false

  }

  // ---------- next question ----------

  async getNextQuestion(): Promise<Question | null> {

    if (this.queue.length === 0) {
      await this.fillQueue()
    }

    const q = this.queue.shift() || null

    if (this.queue.length < this.batchSize / 2) {
      this.fillQueue()
    }

    return q
  }

  // ---------- queue size ----------

  size(): number {
    return this.queue.length
  }

  // ---------- clear queue ----------

  clear(): void {
    this.queue = []
  }

}