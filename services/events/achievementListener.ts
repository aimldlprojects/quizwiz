import { EventBus } from "../../engine/events/eventBus"
import { Events } from "../../engine/events/events"

import { SQLiteDatabase } from "expo-sqlite"

import { StatsRepository } from "../../database/statsRepository"
import { StreakController } from "../../controllers/streakController"
import { BadgeController } from "../../controllers/badgeController"

/*
--------------------------------------------------
Achievement Listener
--------------------------------------------------
*/

export function registerAchievementListener(
  eventBus: EventBus,
  db: SQLiteDatabase,
  userId: number
) {

  const statsRepo = new StatsRepository(db)

  const streakController =
    new StreakController(db)

  const badgeController =
    new BadgeController(db)

  eventBus.on(
    Events.ANSWER_SUBMITTED,
    async () => {

      /*
      --------------------------------------------------
      Update Streak
      --------------------------------------------------
      */

      await streakController.recordPractice(
        userId
      )

      const streakState =
        await streakController.getStreak(
          userId
        )

      /*
      --------------------------------------------------
      Get Stats
      --------------------------------------------------
      */

      const totalCorrect =
        await statsRepo.getTotalCorrect(
          userId
        )

      const totalAttempts =
        await statsRepo.getTotalAttempts(
          userId
        )
      const topicsMastered =
        await statsRepo.getTopicsMastered(
          userId
        )

      /*
      --------------------------------------------------
      Evaluate Badges
      --------------------------------------------------
      */

      await badgeController.evaluate(
        userId,
        {
          totalCorrect,
          totalAttempts,
          streak: streakState.currentStreak,
          topicsMastered
        }
      )

      await badgeController.checkAchievements(
        userId,
        totalCorrect,
        streakState.currentStreak
      )

    }
  )

}
