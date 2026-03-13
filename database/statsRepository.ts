import * as SQLite from "expo-sqlite"

export class StatsRepository {

  private db: SQLite.SQLiteDatabase

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db
  }

  async recordAnswer(
    userId: number,
    correct: number,
    wrong: number
  ) {

    await this.db.runAsync(
      `
      INSERT INTO stats
      (user_id, correct, wrong)
      VALUES (?, ?, ?)
      `,
      [userId, correct, wrong]
    )

  }

  // ---------- total attempts ----------

  async getTotalAttempts(userId: number) {

    const row = await this.db.getFirstAsync<{ count: number }>(
      `
      SELECT COUNT(*) as count
      FROM reviews
      WHERE user_id = ?
      `,
      [userId]
    )

    return row?.count ?? 0
  }

  // ---------- total correct ----------

  async getTotalCorrect(userId: number) {

    const row = await this.db.getFirstAsync<{ count: number }>(
      `
      SELECT COUNT(*) as count
      FROM reviews
      WHERE user_id = ?
      AND last_result != 'again'
      `,
      [userId]
    )

    return row?.count ?? 0
  }

  // ---------- accuracy ----------

  async getAccuracy(userId: number) {

    const attempts = await this.getTotalAttempts(userId)

    if (attempts === 0) return 0

    const correct = await this.getTotalCorrect(userId)

    return Math.round((correct / attempts) * 100)
  }

  // ---------- cards learned ----------

  async getCardsLearned(userId: number) {

    const row = await this.db.getFirstAsync<{ count: number }>(
      `
      SELECT COUNT(*) as count
      FROM reviews
      WHERE user_id = ?
      AND repetition > 0
      `,
      [userId]
    )

    return row?.count ?? 0
  }

  /*
  --------------------------------------------------
  Due Review Count
  --------------------------------------------------
  */

  async getDueReviewCount(
    userId: number
  ) {

    const row =
      await this.db.getFirstAsync<{ count: number }>(
        `
        SELECT COUNT(*) as count
        FROM reviews
        WHERE user_id = ?
        AND next_review <= ?
        `,
        [
          userId,
          Date.now()
        ]
      )

    return row?.count ?? 0

  }

  // ---------- topic progress ----------

  async getTopicProgress(userId: number) {

    const rows = await this.db.getAllAsync(
      `
      SELECT
        t.id,
        t.name,
        COUNT(DISTINCT q.id) as total_questions,
        COUNT(DISTINCT r.question_id) as practiced
      FROM topics t
      LEFT JOIN questions q
        ON q.topic_id = t.id
      LEFT JOIN reviews r
        ON r.question_id = q.id
        AND r.user_id = ?
      GROUP BY t.id
      `,
      [userId]
    )

    return rows.map((row: any) => {

      const progress =
        row.total_questions === 0
          ? 0
          : Math.round(
              (row.practiced / row.total_questions) * 100
            )

      return {
        topicId: row.id,
        topicName: row.name,
        progress
      }

    })
  }

  // ---------- subject progress ----------

  async getSubjectProgress(userId: number) {

    const rows = await this.db.getAllAsync(
      `
      SELECT
        s.id,
        s.name,
        COUNT(DISTINCT q.id) as total_questions,
        COUNT(DISTINCT r.question_id) as practiced
      FROM subjects s
      LEFT JOIN topics t
        ON t.subject_id = s.id
      LEFT JOIN questions q
        ON q.topic_id = t.id
      LEFT JOIN reviews r
        ON r.question_id = q.id
        AND r.user_id = ?
      GROUP BY s.id
      `,
      [userId]
    )

    return rows.map((row: any) => {

      const progress =
        row.total_questions === 0
          ? 0
          : Math.round(
              (row.practiced / row.total_questions) * 100
            )

      return {
        subjectId: row.id,
        subjectName: row.name,
        progress
      }

    })
  }

  async getTopicsMastered(userId: number) {

    const progress =
      await this.getTopicProgress(userId)

    return progress.filter(
      (topic) => topic.progress >= 100
    ).length

  }

  // ---------- debug topics ----------

  async debugTopics() {

  const rows = await this.db.getAllAsync(
    `
      SELECT *
      FROM topics
      `
  )

  console.log("TOPICS TABLE:", rows)

  return rows

}

}
