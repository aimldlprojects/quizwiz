export interface Badge {

  id: string
  title: string
  description: string

  unlocked: boolean
  unlockedAt?: number

}

export interface BadgeMetrics {

  totalCorrect: number
  totalAttempts: number

  streak: number
  topicsMastered: number

}

const DEFAULT_BADGES: Badge[] = [
  {
    id: "first_win",
    title: "First Star",
    description: "Answer your first question correctly.",
    unlocked: false
  },
  {
    id: "first_10_correct",
    title: "Ten in a Row",
    description: "Reach 10 correct answers.",
    unlocked: false
  },
  {
    id: "table_master",
    title: "Table Master",
    description: "Build strong multiplication skills.",
    unlocked: false
  },
  {
    id: "7_day_streak",
    title: "7 Day Streak",
    description: "Practice for seven days in a row.",
    unlocked: false
  },
  {
    id: "100_questions",
    title: "100 Questions",
    description: "Solve 100 questions.",
    unlocked: false
  },
  {
    id: "topic_master",
    title: "Topic Master",
    description: "Complete several topics.",
    unlocked: false
  }
]

export class BadgeEngine {

  private badges: Badge[]

  constructor(existing?: Badge[]) {

    this.badges =
      existing && existing.length > 0
        ? mergeBadges(existing)
        : DEFAULT_BADGES.map((badge) => ({
            ...badge
          }))

  }

  evaluate(metrics: BadgeMetrics): Badge[] {

    for (const badge of this.badges) {
      if (badge.unlocked) {
        continue
      }

      switch (badge.id) {
        case "first_win":
          if (metrics.totalCorrect >= 1) {
            this.unlock(badge)
          }
          break
        case "first_10_correct":
          if (metrics.totalCorrect >= 10) {
            this.unlock(badge)
          }
          break
        case "table_master":
          if (metrics.totalCorrect >= 25) {
            this.unlock(badge)
          }
          break
        case "7_day_streak":
          if (metrics.streak >= 7) {
            this.unlock(badge)
          }
          break
        case "100_questions":
          if (metrics.totalAttempts >= 100) {
            this.unlock(badge)
          }
          break
        case "topic_master":
          if (metrics.topicsMastered >= 3) {
            this.unlock(badge)
          }
          break
      }
    }

    return this.badges

  }

  private unlock(badge: Badge) {

    badge.unlocked = true
    badge.unlockedAt = Date.now()

  }

  unlockBadge(id: string) {

    const badge = this.badges.find(
      (item) => item.id === id
    )

    if (!badge || badge.unlocked) {
      return
    }

    this.unlock(badge)

  }

  getBadges(): Badge[] {

    return this.badges

  }

}

function mergeBadges(
  existing: Badge[]
) {

  const existingById = new Map(
    existing.map((badge) => [badge.id, badge])
  )

  return DEFAULT_BADGES.map((badge) => {
    const loaded =
      existingById.get(badge.id)

    return loaded
      ? {
          ...badge,
          ...loaded,
          unlocked:
            Boolean(loaded.unlocked)
        }
      : {
          ...badge
        }
  })

}
