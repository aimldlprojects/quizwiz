import * as SQLite from "expo-sqlite"
import { markSyncDirty } from "./syncMetaRepository"

export class StatsRepository {

  private db: SQLite.SQLiteDatabase

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db
  }

  async recordAnswer(
    userId: number,
    correct: number,
    wrong: number,
    questionId: number | null = null
  ) {

    await this.db.runAsync(
      `
      INSERT INTO stats
      (user_id, question_id, correct, wrong, practiced_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        questionId,
        correct,
        wrong,
        Date.now(),
        Date.now()
      ]
    )

    await markSyncDirty(
      this.db,
      userId,
      Date.now()
    )

  }

  // ---------- total attempts ----------

  async getTotalAttempts(
    userId: number,
    topicId: number | null = null
  ) {

    const totals = await this.getAccuracyTotals(
      userId,
      topicId
    )

    return totals.attempts
  }

  // ---------- total correct ----------

  async getTotalCorrect(
    userId: number,
    topicId: number | null = null
  ) {

    const totals = await this.getAccuracyTotals(
      userId,
      topicId
    )

    return totals.correct
  }

  // ---------- accuracy ----------

  async getAccuracy(
    userId: number,
    topicId: number | null = null
  ) {

    const totals = await this.getAccuracyTotals(
      userId,
      topicId
    )

    if (totals.attempts === 0) return 0

    return Math.round(
      (totals.correct / totals.attempts) * 100
    )
  }

  async getTotalQuestionCount() {

    const row =
      await this.db.getFirstAsync<{ count: number }>(
        `
        SELECT COUNT(*) as count
        FROM questions
        `
      )

    return row?.count ?? 0

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
    const [topicRows, questionRows, attemptRows] =
      await Promise.all([
        this.db.getAllAsync<{
          id: number
          name: string
          subject_id: number
          parent_topic_id: number | null
        }>(
          `
          SELECT
            id,
            name,
            subject_id,
            parent_topic_id
          FROM topics
          `
        ),
        this.db.getAllAsync<{
          topic_id: number
          total_questions: number
        }>(
          `
          SELECT
            topic_id,
            COUNT(*) as total_questions
          FROM questions
          GROUP BY topic_id
          `
        ),
        this.db.getAllAsync<{
          topic_id: number
          attempts: number
          correct: number
        }>(
          `
          SELECT
            q.topic_id as topic_id,
            SUM(
              COALESCE(s.correct, 0) +
              COALESCE(s.wrong, 0)
            ) as attempts,
            COALESCE(SUM(s.correct), 0) as correct
          FROM stats s
          INNER JOIN questions q
            ON q.id = s.question_id
          WHERE s.user_id = ?
            AND q.topic_id IS NOT NULL
          GROUP BY q.topic_id
          `,
          [userId]
        )
      ])

    const topics = topicRows.map((row) => ({
      topicId: Number(row.id),
      topicName: String(row.name),
      subjectId: Number(row.subject_id),
      parentTopicId:
        row.parent_topic_id == null
          ? null
          : Number(row.parent_topic_id)
    }))

    const totalQuestionsByTopic = new Map<
      number,
      number
    >(
      questionRows.map((row) => [
        Number(row.topic_id),
        Number(row.total_questions) || 0
      ])
    )

    const attemptsByTopic = new Map<
      number,
      {
        attempts: number
        correct: number
      }
    >(
      attemptRows.map((row) => [
        Number(row.topic_id),
        {
          attempts: Number(row.attempts) || 0,
          correct: Number(row.correct) || 0
        }
      ])
    )

    const childrenByParent = new Map<
      number | null,
      typeof topics
    >()

    for (const topic of topics) {
      const siblings =
        childrenByParent.get(topic.parentTopicId) ?? []

      siblings.push(topic)
      childrenByParent.set(topic.parentTopicId, siblings)
    }

    function collectTotals(topicId: number) {
      const current =
        topics.find((topic) => topic.topicId === topicId)

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
        totalQuestionsByTopic.get(topicId) ?? 0
      let practiced =
        attemptsByTopic.get(topicId)?.attempts ?? 0
      let correct =
        attemptsByTopic.get(topicId)?.correct ?? 0

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

    return topics.map((topic) => {
      const totals = collectTotals(topic.topicId)
      const progress =
        totals.practiced === 0
          ? 0
          : Math.round(
              (totals.correct / totals.practiced) * 100
            )

      return {
        topicId: topic.topicId,
        topicName: topic.topicName,
        subjectId: topic.subjectId,
        parentTopicId: topic.parentTopicId,
        totalQuestions: totals.totalQuestions,
        practiced: totals.practiced,
        correct: totals.correct,
        progress
      }
    })
  }

  async getAccuracyTotals(
    userId: number,
    topicId: number | null = null
  ) {

    const topicIds = await this.getTopicScopeIds(
      topicId
    )

    const params: number[] = [userId]
    const topicFilter =
      topicIds == null
        ? ""
        : topicIds.length === 0
          ? "AND 1 = 0"
          : `AND q.topic_id IN (${topicIds
              .map(() => "?")
              .join(", ")})`

    if (topicIds != null) {
      params.push(...topicIds)
    }

    const row = await this.db.getFirstAsync<{
      attempts: number
      correct: number
    }>(
      `
      SELECT
        COALESCE(SUM(
          COALESCE(s.correct, 0) +
          COALESCE(s.wrong, 0)
        ), 0) as attempts,
        COALESCE(SUM(s.correct), 0) as correct
      FROM stats s
      INNER JOIN questions q
        ON q.id = s.question_id
      WHERE s.user_id = ?
      ${topicFilter}
      `,
      params
    )

    return {
      attempts: row?.attempts ?? 0,
      correct: row?.correct ?? 0
    }

  }

  private async getTopicScopeIds(
    topicId: number | null
  ) {

    if (topicId == null) {
      return null
    }

    const rows = await this.db.getAllAsync<{
      id: number
      parent_topic_id: number | null
    }>(
      `
      SELECT id, parent_topic_id
      FROM topics
      `
    )

    const descendants = new Set<number>([
      topicId
    ])

    let expanded = true

    while (expanded) {
      expanded = false

      for (const topic of rows) {
        if (
          topic.parent_topic_id != null &&
          descendants.has(topic.parent_topic_id) &&
          !descendants.has(topic.id)
        ) {
          descendants.add(topic.id)
          expanded = true
        }
      }
    }

    return Array.from(descendants)

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

    return await this.db.getAllAsync(
      `
      SELECT *
      FROM topics
      `
    )

}

}
