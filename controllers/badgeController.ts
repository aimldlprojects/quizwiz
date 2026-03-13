import { SQLiteDatabase } from "expo-sqlite"
import {
    Badge,
    BadgeEngine,
    BadgeMetrics
} from "../engine/gamification/badgeEngine"

export class BadgeController {

  private db: SQLiteDatabase
  private engine: BadgeEngine

  constructor(db: SQLiteDatabase) {

    this.db = db
    this.engine = new BadgeEngine()

  }

  /*
  --------------------------------------------------
  Load Badges From DB
  --------------------------------------------------
  */

  async load(userId: number) {

    const rows =
      await this.db.getAllAsync<Badge>(
        `
        SELECT
          id,
          title,
          description,
          unlocked,
          unlockedAt
        FROM user_badges
        WHERE user_id = ?
        `,
        [userId]
      )

    if (!rows || rows.length === 0) {
      return
    }

    this.engine =
      new BadgeEngine(rows)

  }

  /*
  --------------------------------------------------
  Evaluate Badges
  --------------------------------------------------
  */

  async evaluate(
    userId: number,
    metrics: BadgeMetrics
  ): Promise<Badge[]> {

    await this.load(userId)

    const badges =
      this.engine.evaluate(metrics)

    for (const b of badges) {

      if (!b.unlocked) continue

      await this.db.runAsync(
        `
        INSERT INTO user_badges
        (
          user_id,
          id,
          title,
          description,
          unlocked,
          unlockedAt
        )
        VALUES (?,?,?,?,?,?)

        ON CONFLICT(user_id,id)
        DO UPDATE SET

          unlocked = excluded.unlocked,
          unlockedAt = excluded.unlockedAt
        `,
        [
          userId,
          b.id,
          b.title,
          b.description,
          b.unlocked ? 1 : 0,
          b.unlockedAt ?? null
        ]
      )

    }

    return badges

  }

  async checkAchievements(
    userId: number,
    score: number,
    streak: number
  ) {

    await this.load(userId)

    if (score >= 10) {
      this.engine.unlockBadge(
        "first_10_correct"
      )
    }

    if (score >= 25) {
      this.engine.unlockBadge(
        "table_master"
      )
    }

    if (streak >= 7) {
      this.engine.unlockBadge(
        "7_day_streak"
      )
    }

    const badges = this.engine.getBadges()

    for (const badge of badges) {

      if (!badge.unlocked) continue

      await this.db.runAsync(
        `
        INSERT INTO user_badges
        (
          user_id,
          id,
          title,
          description,
          unlocked,
          unlockedAt
        )
        VALUES (?,?,?,?,?,?)

        ON CONFLICT(user_id,id)
        DO UPDATE SET
          unlocked = excluded.unlocked,
          unlockedAt = excluded.unlockedAt
        `,
        [
          userId,
          badge.id,
          badge.title,
          badge.description,
          badge.unlocked ? 1 : 0,
          badge.unlockedAt ?? null
        ]
      )

    }

    return badges

  }

}
