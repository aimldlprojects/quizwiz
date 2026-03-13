import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import { useEffect, useState } from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { StatsRepository } from "../../database/statsRepository"
import { StreakController } from "../../controllers/streakController"
import { useDatabase } from "../../hooks/useDatabase"
import { useUsers } from "../../hooks/useUsers"

type BadgeLevel = "locked" | "bronze" | "silver" | "gold"

type BadgeCard = {
  id: string
  title: string
  description: string
  value: string
  level: BadgeLevel
}

type AchievementBadge = {
  id: string
  title: string
  description: string
  unlocked: number
}

function getLevelColor(level: BadgeLevel) {

  switch (level) {
    case "gold":
      return "#f59e0b"
    case "silver":
      return "#94a3b8"
    case "bronze":
      return "#b45309"
    default:
      return "#cbd5e1"
  }

}

function getLevelLabel(level: BadgeLevel) {

  switch (level) {
    case "gold":
      return "Gold"
    case "silver":
      return "Silver"
    case "bronze":
      return "Bronze"
    default:
      return "Locked"
  }

}

export default function BadgesScreen() {

  const { db, loading } = useDatabase()
  const {
    activeUser,
    loading: usersLoading
  } = useUsers(db)

  const [badgeCards, setBadgeCards] =
    useState<BadgeCard[]>([])
  const [achievementBadges, setAchievementBadges] =
    useState<AchievementBadge[]>([])

  useEffect(() => {

    async function loadBadges() {

      if (!db || !activeUser) return

      const statsRepo =
        new StatsRepository(db)
      const streakController =
        new StreakController(db)

      const accuracy =
        await statsRepo.getAccuracy(activeUser)
      const totalCorrect =
        await statsRepo.getTotalCorrect(activeUser)
      const cardsLearned =
        await statsRepo.getCardsLearned(activeUser)
      const streakState =
        await streakController.getStreak(activeUser)

      const cards: BadgeCard[] = [
        {
          id: "accuracy",
          title: "Accuracy Medal",
          description:
            "Keep answers correct to level this badge up.",
          value: `${accuracy}%`,
          level:
            accuracy >= 90
              ? "gold"
              : accuracy >= 70
              ? "silver"
              : accuracy >= 40
              ? "bronze"
              : "locked"
        },
        {
          id: "streak",
          title: "Streak Medal",
          description:
            "Practice regularly to climb from bronze to gold.",
          value: `${streakState.currentStreak} days`,
          level:
            streakState.currentStreak >= 14
              ? "gold"
              : streakState.currentStreak >= 7
              ? "silver"
              : streakState.currentStreak >= 1
              ? "bronze"
              : "locked"
        },
        {
          id: "mastery",
          title: "Mastery Medal",
          description:
            "The more correct answers you collect, the higher your level.",
          value: `${totalCorrect} correct`,
          level:
            totalCorrect >= 100
              ? "gold"
              : totalCorrect >= 25
              ? "silver"
              : totalCorrect >= 5
              ? "bronze"
              : "locked"
        },
        {
          id: "learner",
          title: "Learner Medal",
          description:
            "Unlock higher ranks by reviewing more cards.",
          value: `${cardsLearned} cards`,
          level:
            cardsLearned >= 75
              ? "gold"
              : cardsLearned >= 30
              ? "silver"
              : cardsLearned >= 10
              ? "bronze"
              : "locked"
        }
      ]

      setBadgeCards(cards)

      const earned =
        await db.getAllAsync<AchievementBadge>(
          `
          SELECT
            b.id,
            b.title,
            b.description,
            CASE
              WHEN ub.id IS NULL THEN 0
              ELSE 1
            END as unlocked
          FROM badges b
          LEFT JOIN user_badges ub
            ON ub.id = b.id
            AND ub.user_id = ?
          ORDER BY b.title
          `,
          [activeUser]
        )

      setAchievementBadges(earned)

    }

    loadBadges()

  }, [db, activeUser])

  if (loading || usersLoading || !db) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading badges...
        </Text>
      </SafeAreaView>
    )
  }

  if (!activeUser) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Choose a user profile first.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
      >
        <Text style={styles.title}>
          Level Badges
        </Text>

        <Text style={styles.subtitle}>
          Bronze, silver, and gold badges rise
          with your performance.
        </Text>

        {badgeCards.map((badge) => (
          <View
            key={badge.id}
            style={styles.badgeCard}
          >
            <View
              style={[
                styles.badgeIcon,
                {
                  backgroundColor:
                    getLevelColor(badge.level)
                }
              ]}
            >
              <MaterialIcons
                name="workspace-premium"
                size={34}
                color="#ffffff"
              />
            </View>

            <View style={styles.badgeBody}>
              <Text style={styles.badgeTitle}>
                {badge.title}
              </Text>

              <Text style={styles.badgeText}>
                {badge.description}
              </Text>

              <View style={styles.badgeFooter}>
                <Text style={styles.badgeValue}>
                  {badge.value}
                </Text>

                <Text
                  style={[
                    styles.levelPill,
                    {
                      color:
                        getLevelColor(badge.level)
                    }
                  ]}
                >
                  {getLevelLabel(badge.level)}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>
          Achievement Stickers
        </Text>

        {achievementBadges.map((badge) => (
          <View
            key={badge.id}
            style={styles.achievementCard}
          >
            <MaterialIcons
              name={
                badge.unlocked
                  ? "emoji-events"
                  : "lock"
              }
              size={26}
              color={
                badge.unlocked
                  ? "#f59e0b"
                  : "#94a3b8"
              }
            />

            <View style={styles.achievementBody}>
              <Text style={styles.achievementTitle}>
                {badge.title}
              </Text>

              <Text style={styles.achievementText}>
                {badge.description}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )

}

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: "#f8fbff"
  },

  container: {
    padding: 20,
    paddingBottom: 120,
    gap: 14
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fbff"
  },

  loadingText: {
    fontSize: 18,
    color: "#1e3a5f"
  },

  title: {
    fontSize: 30,
    color: "#1e3a5f",
    fontWeight: "800"
  },

  subtitle: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6
  },

  sectionTitle: {
    marginTop: 10,
    fontSize: 22,
    color: "#1e3a5f",
    fontWeight: "800"
  },

  badgeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    gap: 16
  },

  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },

  badgeBody: {
    flex: 1
  },

  badgeTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e3a5f"
  },

  badgeText: {
    color: "#475569",
    marginTop: 6,
    lineHeight: 21
  },

  badgeFooter: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  badgeValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a5f"
  },

  levelPill: {
    fontWeight: "800",
    fontSize: 14
  },

  achievementCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    alignItems: "center"
  },

  achievementBody: {
    flex: 1
  },

  achievementTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1e3a5f"
  },

  achievementText: {
    marginTop: 4,
    color: "#475569",
    lineHeight: 20
  }

})
