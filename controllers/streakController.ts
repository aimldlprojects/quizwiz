import { SQLiteDatabase } from "expo-sqlite"
import { StreakEngine, StreakState } from "../engine/gamification/streakEngine"

export class StreakController {

  private db: SQLiteDatabase
  private engine: StreakEngine

  constructor(db: SQLiteDatabase) {
    this.db = db
    this.engine = new StreakEngine()
  }

  /*
  --------------------------------------------------
  Load Streak State
  --------------------------------------------------
  */

  async load(userId: number): Promise<void> {

    const row =
      await this.db.getFirstAsync<{
        current_streak: number
        longest_streak: number
        last_practice_date: string
      }>(
        `
        SELECT
          current_streak,
          longest_streak,
          last_practice_date
        FROM user_streak
        WHERE user_id = ?
        `,
        [userId]
      )

    if (!row) return

    this.engine =
      new StreakEngine({
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        lastPracticeDate: row.last_practice_date
      })

  }

  /*
  --------------------------------------------------
  Record Practice
  --------------------------------------------------
  */

  async recordPractice(userId: number) {

    const state =
      this.engine.recordPractice()

    await this.db.runAsync(
      `
      INSERT INTO user_streak
      (
        user_id,
        current_streak,
        longest_streak,
        last_practice_date
      )
      VALUES (?,?,?,?)

      ON CONFLICT(user_id)
      DO UPDATE SET

        current_streak = excluded.current_streak,
        longest_streak = excluded.longest_streak,
        last_practice_date = excluded.last_practice_date
      `,
      [
        userId,
        state.currentStreak,
        state.longestStreak,
        state.lastPracticeDate
      ]
    )

  }

  /*
  --------------------------------------------------
  Get Streak
  --------------------------------------------------
  */

  async getStreak(userId: number): Promise<StreakState> {

    await this.load(userId)

    return this.engine.getState()

  }

}