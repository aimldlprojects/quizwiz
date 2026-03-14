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
      (user_id, correct, wrong, practiced_at)
      VALUES (?, ?, ?, ?)
      `,
      [
        userId,
        correct,
        wrong,
        Date.now()
      ]
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
        t.subject_id,
        t.parent_topic_id,
        COUNT(DISTINCT q.id) as total_questions,
        COUNT(DISTINCT r.question_id) as practiced,
        COUNT(
          DISTINCT CASE
            WHEN r.last_result IS NOT NULL
             AND r.last_result != 'again'
            THEN r.question_id
          END
        ) as correct
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

    const typedRows = rows.map((row: any) => ({
      topicId: Number(row.id),
      topicName: String(row.name),
      subjectId: Number(row.subject_id),
      parentTopicId:
        row.parent_topic_id == null
          ? null
          : Number(row.parent_topic_id),
      totalQuestions: Number(row.total_questions) || 0,
      practiced: Number(row.practiced) || 0,
      correct: Number(row.correct) || 0
    }))

    const childrenByParent = new Map<
      number | null,
      typeof typedRows
    >()

    for (const row of typedRows) {
      const siblings =
        childrenByParent.get(row.parentTopicId) ?? []

      siblings.push(row)
      childrenByParent.set(row.parentTopicId, siblings)
    }

    function collectTotals(
      topicId: number
    ): {
      totalQuestions: number
      practiced: number
      correct: number
    } {

      const current =
        typedRows.find(
          (row) => row.topicId === topicId
        )

      if (!current) {
        return {
          totalQuestions: 0,
          practiced: 0,
          correct: 0
        }
      }

      const children =
        childrenByParent.get(topicId) ?? []

      let totalQuestions =
        current.totalQuestions
      let practiced = current.practiced
      let correct = current.correct

      for (const child of children) {
        const childTotals =
          collectTotals(child.topicId)

        totalQuestions +=
          childTotals.totalQuestions
        practiced += childTotals.practiced
        correct += childTotals.correct
      }

      return {
        totalQuestions,
        practiced,
        correct
      }

    }

    return typedRows.map((row) => {

      const totals =
        collectTotals(row.topicId)
      const progress =
        totals.practiced === 0
          ? 0
          : Math.round(
              (totals.correct /
                totals.practiced) *
                100
            )

      return {
        topicId: row.topicId,
        topicName: row.topicName,
        subjectId: row.subjectId,
        parentTopicId: row.parentTopicId,
        totalQuestions:
          totals.totalQuestions,
        practiced: totals.practiced,
        correct: totals.correct,
        progress
      }

    })
  }

  // ---------- subject progress ----------

  async getSubjectProgress(userId: number) {

    const topicProgress =
      await this.getTopicProgress(userId)
    const rows = await this.db.getAllAsync<{
      id: number
      name: string
    }>(
      `
      SELECT id, name
      FROM subjects
      ORDER BY name
      `
    )

    return rows.map((row) => {

      const subjectTopics =
        topicProgress.filter(
          (topic) =>
            topic.subjectId === row.id &&
            topic.parentTopicId == null
        )

      const practiced = subjectTopics.reduce(
        (total, topic) =>
          total + topic.practiced,
        0
      )
      const correct = subjectTopics.reduce(
        (total, topic) =>
          total + topic.correct,
        0
      )
      const totalQuestions =
        subjectTopics.reduce(
          (total, topic) =>
            total + topic.totalQuestions,
          0
        )
      const progress =
        practiced === 0
          ? 0
          : Math.round(
              (correct / practiced) * 100
            )

      return {
        subjectId: row.id,
        subjectName: row.name,
        totalQuestions,
        practiced,
        correct,
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
