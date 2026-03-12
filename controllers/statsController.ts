import * as SQLite from "expo-sqlite"
import { StatsRepository } from "../database/statsRepository"

export class StatsController {

  private repo: StatsRepository
  private userId: number

  constructor(
    db: SQLite.SQLiteDatabase,
    userId: number
  ) {

    this.repo = new StatsRepository(db)
    this.userId = userId

  }

  /*
  --------------------------------------------------
  Dashboard Stats
  --------------------------------------------------
  */

  async getDashboardStats() {

    const accuracy =
      await this.repo.getAccuracy(this.userId)

    const attempts =
      await this.repo.getTotalAttempts(this.userId)

    const learned =
      await this.repo.getCardsLearned(this.userId)

    const due =
      await this.repo.getDueReviewCount(this.userId)

    return {
      accuracy,
      attempts,
      learned,
      due
    }

  }

  /*
  --------------------------------------------------
  Topic Progress
  --------------------------------------------------
  */

  async getTopicProgress() {

    return this.repo.getTopicProgress(
      this.userId
    )

  }

  /*
  --------------------------------------------------
  Subject Progress
  --------------------------------------------------
  */

  async getSubjectProgress() {

    return this.repo.getSubjectProgress(
      this.userId
    )

  }

}