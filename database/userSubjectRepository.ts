import { SQLiteDatabase } from "expo-sqlite"

export type SubjectPermission = {
  id: number
  name: string
  enabled: number
}

export type TopicPermission = {
  id: number
  name: string
  key: string | null
  parent_topic_id: number | null
  subject_id: number
  enabled: number
}

export class UserSubjectRepository {

  private db: SQLiteDatabase

  constructor(db: SQLiteDatabase) {
    this.db = db
  }

  async getSubjectsForUser(
    userId: number
  ) {

    return this.db.getAllAsync<SubjectPermission>(
      `
      SELECT
        s.id,
        s.name,
        CASE
          WHEN us.user_id IS NULL THEN 0
          ELSE 1
        END as enabled
      FROM subjects s
      LEFT JOIN user_subjects us
        ON us.subject_id = s.id
        AND us.user_id = ?
      ORDER BY s.name
      `,
      [userId]
    )

  }

  async getAllowedSubjects(
    userId: number
  ) {

    return this.db.getAllAsync<{
      id: number
      name: string
    }>(
      `
      SELECT s.id, s.name
      FROM subjects s
      INNER JOIN user_subjects us
        ON us.subject_id = s.id
      WHERE us.user_id = ?
      ORDER BY s.name
      `,
      [userId]
    )

  }

  async setSubjectEnabled(
    userId: number,
    subjectId: number,
    enabled: boolean
  ) {

    if (enabled) {
      await this.db.runAsync(
        `
        INSERT OR IGNORE INTO user_subjects (
          user_id,
          subject_id
        )
        VALUES (?, ?)
        `,
        [userId, subjectId]
      )
      return
    }

    await this.db.runAsync(
      `
      DELETE FROM user_subjects
      WHERE user_id = ?
      AND subject_id = ?
      `,
      [userId, subjectId]
    )

  }

  async grantAllSubjects(
    userId: number
  ) {

    await this.db.runAsync(
      `
      INSERT OR IGNORE INTO user_subjects (
        user_id,
        subject_id
      )
      SELECT ?, id
      FROM subjects
      `,
      [userId]
    )

  }

  async getTopicsForUser(
    userId: number,
    subjectId: number
  ) {

    return this.db.getAllAsync<TopicPermission>(
      `
      SELECT
        t.id,
        t.name,
        t.key,
        t.parent_topic_id,
        t.subject_id,
        CASE
          WHEN ut.user_id IS NULL THEN 0
          ELSE 1
        END as enabled
      FROM topics t
      LEFT JOIN user_topics ut
        ON ut.topic_id = t.id
        AND ut.user_id = ?
      WHERE t.subject_id = ?
      ORDER BY
        COALESCE(t.parent_topic_id, 0),
        t.name
      `,
      [userId, subjectId]
    )

  }

  async getAllowedTopics(
    userId: number
  ) {

    return this.db.getAllAsync<{
      id: number
    }>(
      `
      SELECT topic_id as id
      FROM user_topics
      WHERE user_id = ?
      `,
      [userId]
    )

  }

  async setTopicEnabled(
    userId: number,
    topicId: number,
    enabled: boolean
  ) {

    const topicIds =
      await this.getTopicTreeIds(topicId)

    await this.setTopicIdsEnabled(
      userId,
      topicIds,
      enabled
    )

  }

  async setTopicsForSubjectEnabled(
    userId: number,
    subjectId: number,
    enabled: boolean
  ) {

    const topicIds =
      await this.db.getAllAsync<{
        id: number
      }>(
        `
        SELECT id
        FROM topics
        WHERE subject_id = ?
        `,
        [subjectId]
      )

    await this.setTopicIdsEnabled(
      userId,
      topicIds.map((topic) => topic.id),
      enabled
    )

  }

  async grantAllTopics(
    userId: number
  ) {

    await this.db.runAsync(
      `
      INSERT OR IGNORE INTO user_topics (
        user_id,
        topic_id
      )
      SELECT ?, id
      FROM topics
      `,
      [userId]
    )

  }

  private async getTopicTreeIds(
    topicId: number
  ) {

    const rows =
      await this.db.getAllAsync<{
        id: number
      }>(
        `
        WITH RECURSIVE topic_tree(id) AS (
          SELECT id
          FROM topics
          WHERE id = ?

          UNION ALL

          SELECT t.id
          FROM topics t
          INNER JOIN topic_tree tt
            ON t.parent_topic_id = tt.id
        )
        SELECT id
        FROM topic_tree
        `,
        [topicId]
      )

    return rows.map((row) => row.id)

  }

  private async setTopicIdsEnabled(
    userId: number,
    topicIds: number[],
    enabled: boolean
  ) {

    if (topicIds.length === 0) {
      return
    }

    const placeholders =
      topicIds.map(() => "?").join(", ")

    if (enabled) {
      await this.db.runAsync(
        `
        INSERT OR IGNORE INTO user_topics (
          user_id,
          topic_id
        )
        SELECT ?, id
        FROM topics
        WHERE id IN (${placeholders})
        `,
        [userId, ...topicIds]
      )
      return
    }

    await this.db.runAsync(
      `
      DELETE FROM user_topics
      WHERE user_id = ?
      AND topic_id IN (${placeholders})
      `,
      [userId, ...topicIds]
    )

  }

}
