import { SQLiteDatabase } from "expo-sqlite"

const BADGES = [
  {
    id: "first_win",
    title: "First Star",
    description: "Answer your first question correctly."
  },
  {
    id: "first_10_correct",
    title: "Ten in a Row",
    description: "Reach 10 correct answers."
  },
  {
    id: "table_master",
    title: "Table Master",
    description: "Show strong multiplication skills."
  },
  {
    id: "7_day_streak",
    title: "7 Day Streak",
    description: "Practice seven days in a row."
  },
  {
    id: "100_questions",
    title: "100 Questions",
    description: "Solve 100 questions."
  },
  {
    id: "topic_master",
    title: "Topic Master",
    description: "Complete multiple topics."
  }
]

export async function seedBadges(
  db: SQLiteDatabase
) {

  for (const badge of BADGES) {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO badges (
        id,
        title,
        description
      )
      VALUES (?, ?, ?)
      `,
      [
        badge.id,
        badge.title,
        badge.description
      ]
    )
  }

}
