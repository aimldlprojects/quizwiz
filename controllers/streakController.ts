import { SQLiteDatabase } from "expo-sqlite"
import { StreakEngine, StreakState } from "../engine/gamification/streakEngine"
import {
  markSyncDirty
} from "../database/syncMetaRepository"

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

    const currentSetting =
      await this.db.getFirstAsync<{
        value: string | null
      }>(
        `
        SELECT value
        FROM settings
        WHERE user_id = ?
          AND key = ?
        `,
        [userId, `streak_current_user_${userId}`]
      )
    const longestSetting =
      await this.db.getFirstAsync<{
        value: string | null
      }>(
        `
        SELECT value
        FROM settings
        WHERE user_id = ?
          AND key = ?
        `,
        [userId, `streak_longest_user_${userId}`]
      )
    const dateSetting =
      await this.db.getFirstAsync<{
        value: string | null
      }>(
        `
        SELECT value
        FROM settings
        WHERE user_id = ?
          AND key = ?
        `,
        [
          userId,
          `streak_last_practice_date_user_${userId}`
        ]
      )

    if (
      currentSetting?.value != null ||
      longestSetting?.value != null ||
      dateSetting?.value != null
    ) {
      this.engine =
        new StreakEngine({
          currentStreak:
            Number(currentSetting?.value ?? 0) || 0,
          longestStreak:
            Number(longestSetting?.value ?? 0) || 0,
          lastPracticeDate:
            dateSetting?.value ?? ""
        })

      return
    }

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

    const now = Date.now()

    await Promise.all([
      this.db.runAsync(
        `
        INSERT INTO settings (
          user_id,
          key,
          value,
          updated_at
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, key)
        DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
        `,
        [
          userId,
          `streak_current_user_${userId}`,
          String(state.currentStreak),
          now
        ]
      ),
      this.db.runAsync(
        `
        INSERT INTO settings (
          user_id,
          key,
          value,
          updated_at
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, key)
        DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
        `,
        [
          userId,
          `streak_longest_user_${userId}`,
          String(state.longestStreak),
          now
        ]
      ),
      this.db.runAsync(
        `
        INSERT INTO settings (
          user_id,
          key,
          value,
          updated_at
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, key)
        DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
        `,
        [
          userId,
          `streak_last_practice_date_user_${userId}`,
          state.lastPracticeDate,
          now
        ]
      )
    ])

    await markSyncDirty(
      this.db,
      userId,
      now
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
