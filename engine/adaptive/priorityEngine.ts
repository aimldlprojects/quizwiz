// engine/adaptive/priorityEngine.ts

export interface QuestionMetrics {

  questionId: number

  errorRate: number        // 0 → 1
  avgResponseTime: number  // seconds

  reviewDue: boolean
  difficulty: number       // 1 → 5

}

export interface PriorityResult {

  questionId: number
  score: number

}

export class PriorityEngine {

  // weights
  private static ERROR_WEIGHT = 0.5
  private static TIME_WEIGHT = 0.2
  private static REVIEW_WEIGHT = 0.2
  private static DIFFICULTY_WEIGHT = 0.1

  // ---------- calculate priority ----------

  static calculate(
    metrics: QuestionMetrics
  ): PriorityResult {

    const reviewScore =
      metrics.reviewDue ? 1 : 0

    const score =
      metrics.errorRate * this.ERROR_WEIGHT +
      metrics.avgResponseTime * this.TIME_WEIGHT +
      reviewScore * this.REVIEW_WEIGHT +
      metrics.difficulty * this.DIFFICULTY_WEIGHT

    return {

      questionId: metrics.questionId,
      score

    }

  }

  // ---------- rank questions ----------

  static rank(
    metricsList: QuestionMetrics[]
  ): PriorityResult[] {

    const scored =
      metricsList.map(m => this.calculate(m))

    return scored.sort(
      (a, b) => b.score - a.score
    )

  }

}