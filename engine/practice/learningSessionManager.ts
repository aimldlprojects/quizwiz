import { SessionCache } from "../sessionCache"
import { Question, QuestionQueue } from "./questionQueue"

/*
--------------------------------------------------
Learning Session Manager
--------------------------------------------------
*/

export class LearningSessionManager {

  private cache = new SessionCache<Question>()
  private queue: QuestionQueue
  private restored = false

  constructor(queue: QuestionQueue) {
    this.queue = queue
  }

  /*
  --------------------------------------------------
  Start Session
  --------------------------------------------------
  */

  async startSession(batchSize: number = 20) {

    if (this.restored) {
      this.restored = false
      return this.cache.next()
    }

    await this.queue.init()

    const questions: Question[] = []

    for (let i = 0; i < batchSize; i++) {

      const q = await this.queue.getNextQuestion()

      if (!q) break

      questions.push(q)

    }

    this.cache.load(questions)

    return this.cache.next()

  }

  /*
  --------------------------------------------------
  Next Question
  --------------------------------------------------
  */

  async nextQuestion() {

    let question = this.cache.next()

    if (!question) {
      question = await this.queue.getNextQuestion()
    }

    await this.prefetch()

    return question
  }

  /*
  --------------------------------------------------
  Prefetch Questions
  --------------------------------------------------
  */

  private async prefetch() {

    if (this.cache.remaining() > 5) return

    const extra: Question[] = []

    for (let i = 0; i < 10; i++) {

      const q = await this.queue.getNextQuestion()

      if (!q) break

      extra.push(q)

    }

    if (extra.length === 0) return

    const remaining: Question[] = []

    let q = this.cache.next()

    while (q) {

      remaining.push(q)

      q = this.cache.next()

    }

    this.cache.load([
      ...remaining,
      ...extra
    ])

  }

  /*
  --------------------------------------------------
  Remaining Cards
  --------------------------------------------------
  */

  getRemaining() {

    return this.cache.remaining()

  }

  snapshot() {
    return this.cache.snapshot()
  }

  restore(
    snapshot: {
      items: Question[]
      index: number
    }
  ) {
    this.cache.restore(snapshot)
    this.restored = true
  }

  shuffleRemaining() {
    this.cache.shuffleRemaining()
  }

  reset() {
    this.cache.clear()
    this.restored = false
  }

}
