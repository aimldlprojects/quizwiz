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

export class BadgeEngine {

  private badges: Badge[]

  constructor(existing?: Badge[]) {

    this.badges = existing ?? [

      {
        id: "first_win",
        title: "First Correct Answer",
        description: "Answered your first question correctly",
        unlocked: false
      },

      {
        id: "streak_7",
        title: "7 Day Streak",
        description: "Practiced 7 days in a row",
        unlocked: false
      },

      {
        id: "hundred_correct",
        title: "Century",
        description: "Answered 100 questions correctly",
        unlocked: false
      },

      {
        id: "topic_master",
        title: "Topic Master",
        description: "Mastered 5 topics",
        unlocked: false
      }

    ]

  }

  /*
  --------------------------------------------------
  Evaluate Badges
  --------------------------------------------------
  */

  evaluate(metrics: BadgeMetrics): Badge[] {

    for (const badge of this.badges) {

      if (badge.unlocked) continue

      switch (badge.id) {

        case "first_win":

          if (metrics.totalCorrect >= 1) {
            this.unlock(badge)
          }

          break

        case "streak_7":

          if (metrics.streak >= 7) {
            this.unlock(badge)
          }

          break

        case "hundred_correct":

          if (metrics.totalCorrect >= 100) {
            this.unlock(badge)
          }

          break

        case "topic_master":

          if (metrics.topicsMastered >= 5) {
            this.unlock(badge)
          }

          break

      }

    }

    return this.badges

  }

  /*
  --------------------------------------------------
  Unlock Badge
  --------------------------------------------------
  */

  private unlock(badge: Badge) {

    badge.unlocked = true
    badge.unlockedAt = Date.now()

  }

  /*
  --------------------------------------------------
  Get Badges
  --------------------------------------------------
  */

  getBadges(): Badge[] {

    return this.badges

  }

}