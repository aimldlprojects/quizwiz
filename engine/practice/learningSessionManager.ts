import { SessionCache } from "../sessionCache"
import { QuestionQueue } from "./questionQueue"

/*
--------------------------------------------------
Learning Session Manager
--------------------------------------------------
*/

export class LearningSessionManager {

  private cache = new SessionCache<any>()
  private queue: QuestionQueue

  constructor(queue: QuestionQueue) {
    this.queue = queue
  }

  /*
  --------------------------------------------------
  Start Session
  --------------------------------------------------
  */

  async startSession(batchSize: number = 20) {

    await this.queue.init()

    const questions: any[] = []

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
  Prefetch
  --------------------------------------------------
  */

  private async prefetch() {

    if (this.cache.remaining() > 5) return

    const extra: any[] = []

    for (let i = 0; i < 10; i++) {

      const q = await this.queue.getNextQuestion()

      if (!q) break

      extra.push(q)

    }

    if (extra.length === 0) return

    const remaining: any[] = []

    let q = this.cache.next()

    while (q) {
      remaining.push(q)
      q = this.cache.next()
    }

    this.cache.load([...remaining, ...extra])

  }

  /*
  --------------------------------------------------
  Remaining
  --------------------------------------------------
  */

  getRemaining() {
    return this.cache.remaining()
  }

}