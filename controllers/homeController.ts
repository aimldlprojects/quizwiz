import { SQLiteDatabase } from "expo-sqlite"

import { StatsRepository } from "../database/statsRepository"
import { StreakController } from "./streakController"

export class HomeController {

  private stats: StatsRepository
  private streak: StreakController

  constructor(db: SQLiteDatabase) {

    this.stats =
      new StatsRepository(db)

    this.streak =
      new StreakController(db)

  }

  /*
  --------------------------------------------------
  Dashboard Data
  --------------------------------------------------
  */

  async getDashboard(userId: number) {

    const dueReviews =
      await this.stats.getDueReviewCount(
        userId
      )

    const accuracy =
      await this.stats.getAccuracy(
        userId
      )

    const streakState =
      await this.streak.getStreak(
        userId
      )

    return {

      dueReviews,

      accuracy,

      streak:
        streakState.currentStreak

    }

  }

}