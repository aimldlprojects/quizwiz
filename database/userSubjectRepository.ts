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

  async savePermissionSnapshots(userId: number) {

    const [subjects, topics] = await Promise.all([
      this.getAllowedSubjects(userId),
      this.getAllowedTopics(userId)
    ])

    const timestamp = Date.now()

    await this.upsertSetting(
      userId,
      this.getSubjectSnapshotKey(userId),
      JSON.stringify(subjects.map((row) => row.id)),
      timestamp
    )

    await this.upsertSetting(
      userId,
      this.getTopicSnapshotKey(userId),
      JSON.stringify(topics.map((row) => row.id)),
      timestamp
    )

  }

  async restorePermissionSnapshots(userId: number) {

    const [subjectSnapshot, topicSnapshot] =
      await Promise.all([
        this.getSnapshotValue(
          userId,
          this.getSubjectSnapshotKey(userId)
        ),
        this.getSnapshotValue(
          userId,
          this.getTopicSnapshotKey(userId)
        )
      ])

    if (!subjectSnapshot && !topicSnapshot) {
      return
    }

    if (subjectSnapshot) {
      const subjectIds =
        this.parseIdList(subjectSnapshot)

      await this.db.runAsync(
        `
        DELETE FROM user_subjects
        WHERE user_id = ?
        `,
        [userId]
      )

      if (subjectIds.length > 0) {
        const placeholders =
          subjectIds.map(() => "?").join(", ")

        await this.db.runAsync(
          `
          INSERT OR IGNORE INTO user_subjects (
            user_id,
            subject_id
          )
          SELECT ?, id
          FROM subjects
          WHERE id IN (${placeholders})
          `,
          [userId, ...subjectIds]
        )
      }
    }

    if (topicSnapshot) {
      const topicIds = this.parseIdList(topicSnapshot)

      await this.db.runAsync(
        `
        DELETE FROM user_topics
        WHERE user_id = ?
        `,
        [userId]
      )

      if (topicIds.length > 0) {
        const placeholders =
          topicIds.map(() => "?").join(", ")

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
      }
    }

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

  async grantSubjectsByName(
    userId: number,
    names: string[]
  ) {

    if (names.length === 0) {
      return
    }

    const placeholders =
      names.map(() => "?").join(", ")

    await this.db.runAsync(
      `
      INSERT OR IGNORE INTO user_subjects (
        user_id,
        subject_id
      )
      SELECT ?, id
      FROM subjects
      WHERE name IN (${placeholders})
      `,
      [userId, ...names]
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

  async grantTopicsByKeys(
    userId: number,
    keys: string[]
  ) {

    if (keys.length === 0) {
      return
    }

    const topicIds = new Set<number>()

    for (const key of keys) {

      const row =
        await this.db.getFirstAsync<{
          id: number
        }>(
          `
          SELECT id
          FROM topics
          WHERE key = ?
          LIMIT 1
          `,
          [key]
        )

      if (!row?.id) {
        continue
      }

      const treeIds =
        await this.getTopicTreeIds(row.id)

      for (const id of treeIds) {
        topicIds.add(id)
      }

    }

    if (topicIds.size === 0) {
      return
    }

    await this.setTopicIdsEnabled(
      userId,
      Array.from(topicIds),
      true
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

  private getSubjectSnapshotKey(userId: number) {
    return `admin_visible_subject_ids_user_${userId}`
  }

  private getTopicSnapshotKey(userId: number) {
    return `admin_visible_topic_ids_user_${userId}`
  }

  private async upsertSetting(
    userId: number,
    key: string,
    value: string,
    updatedAt: number
  ) {

    await this.db.runAsync(
      `
      INSERT INTO settings (
        user_id,
        key,
        value,
        updated_at
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, key)
      DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
      `,
      [userId, key, value, updatedAt]
    )

  }

  private async getSnapshotValue(
    userId: number,
    key: string
  ) {

    const row = await this.db.getFirstAsync<{
      value: string | null
    }>(
      `
      SELECT value
      FROM settings
      WHERE user_id = ?
        AND key = ?
      LIMIT 1
      `,
      [userId, key]
    )

    return row?.value ?? null

  }

  private parseIdList(value: string) {

    try {
      const parsed = JSON.parse(value)

      if (!Array.isArray(parsed)) {
        return []
      }

      return parsed
        .map((item) => Number(item))
        .filter((item) =>
          Number.isFinite(item)
        )
    } catch {
      return []
    }

  }

}
