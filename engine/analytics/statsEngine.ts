// engine/analytics/statsEngine.ts

export interface QuestionStats {

  questionId: number

  attempts: number
  correct: number

  totalResponseTime: number

}

export interface StatsResult {

  questionId: number

  errorRate: number
  avgResponseTime: number

  mastery: number

}

export class StatsEngine {

  private stats: Map<number, QuestionStats> =
    new Map()

  // ---------- record attempt ----------

  recordAttempt(
    questionId: number,
    correct: boolean,
    responseTime: number
  ) {

    let s = this.stats.get(questionId)

    if (!s) {

      s = {
        questionId,
        attempts: 0,
        correct: 0,
        totalResponseTime: 0
      }

      this.stats.set(questionId, s)

    }

    s.attempts += 1

    if (correct) {
      s.correct += 1
    }

    s.totalResponseTime += responseTime

  }

  // ---------- compute stats ----------

  getStats(questionId: number): StatsResult | null {

    const s = this.stats.get(questionId)

    if (!s) return null

    const errorRate =
      1 - (s.correct / s.attempts)

    const avgResponseTime =
      s.totalResponseTime / s.attempts

    const mastery =
      Math.round((s.correct / s.attempts) * 100)

    return {

      questionId,

      errorRate,

      avgResponseTime,

      mastery

    }

  }

  // ---------- get all stats ----------

  getAllStats(): StatsResult[] {

    const results: StatsResult[] = []

    for (const s of this.stats.values()) {

      const errorRate =
        1 - (s.correct / s.attempts)

      const avgResponseTime =
        s.totalResponseTime / s.attempts

      const mastery =
        Math.round((s.correct / s.attempts) * 100)

      results.push({

        questionId: s.questionId,

        errorRate,
        avgResponseTime,

        mastery

      })

    }

    return results

  }

}