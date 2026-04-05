import { SQLiteDatabase } from "expo-sqlite"

export interface User {
  id: number
  name: string
  disabled: number
}

export class UserRepository {

  private db: SQLiteDatabase

  constructor(db: SQLiteDatabase) {
    this.db = db
  }

  /*
  --------------------------------------------------
  Get All Users
  --------------------------------------------------
  */

  async getUsers(): Promise<User[]> {
    return this.getUsersByStatus(false)
  }

  async getUsersByStatus(
    includeDisabled: boolean
  ): Promise<User[]> {

    const rows =
      await this.db.getAllAsync<User>(
        `
        SELECT
          u.id,
          u.name,
          CASE
            WHEN ds.value IS NULL THEN COALESCE(u.disabled, 0)
            WHEN ds.value IN ('1', 'true') THEN 1
            ELSE 0
          END as disabled
        FROM users u
        LEFT JOIN settings ds
          ON ds.user_id = 0
          AND ds.key = 'user_disabled_user_' || u.id
        ORDER BY u.id DESC
        `
      )

    const validRows = rows.filter(
      (row) =>
        row.id != null &&
        row.name != null &&
        row.name.trim().length > 0
    )

    if (includeDisabled) {
      return validRows
    }

    return validRows.filter(
      (row) => row.disabled !== 1
    )

  }

  /*
  --------------------------------------------------
  Get User
  --------------------------------------------------
  */

  async getUser(
    id: number
  ): Promise<User | null> {

    const row =
      await this.db.getFirstAsync<User>(
        `
        SELECT
          u.id,
          u.name,
          CASE
            WHEN ds.value IS NULL THEN COALESCE(u.disabled, 0)
            WHEN ds.value IN ('1', 'true') THEN 1
            ELSE 0
          END as disabled
        FROM users u
        LEFT JOIN settings ds
          ON ds.user_id = 0
          AND ds.key = 'user_disabled_user_' || u.id
        WHERE u.id = ?
        `,
        [id]
      )

    return row ?? null

  }

  /*
  --------------------------------------------------
  Create User
  --------------------------------------------------
  */

  async createUser(
    name: string
  ) {

    const existing =
      await this.db.getFirstAsync<{
        id: number
        disabled: number
      }>(
        `
        SELECT
          id,
          COALESCE(disabled, 0) as disabled
        FROM users
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
        `,
        [name]
      )

    if (existing) {
      if (existing.disabled === 1) {
        await this.db.runAsync(
          `
          UPDATE users
          SET
            name = ?,
            disabled = 0
          WHERE id = ?
          `,
          [name, existing.id]
        )

        await this.db.runAsync(
          `
          INSERT INTO settings (
            user_id,
            key,
            value,
            updated_at
          )
          VALUES (0, ?, ?, ?)
          ON CONFLICT(user_id, key)
          DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
          `,
          [
            this.getDisabledSettingKey(existing.id),
            "0",
            Date.now()
          ]
        )

        return existing.id
      }

      throw new Error(
        "A user with this name already exists."
      )
    }

    const result =
      await this.db.runAsync(
      `
      INSERT INTO users(name, disabled)
      VALUES(?, 0)
      `,
      [name]
    )

    return result.lastInsertRowId

  }

  /*
  --------------------------------------------------
  Delete User
  --------------------------------------------------
  */

  async deleteUser(
    id: number,
    name?: string
  ) {

    const userId = Number(id)
    const normalizedName =
      name?.trim().toLowerCase() ?? ""
    const matchingRows =
      await this.db.getAllAsync<{
        id: number
      }>(
        `
        SELECT COALESCE(id, rowid) as id
        FROM users
        WHERE id = ?
        OR (
          ? != ''
          AND LOWER(TRIM(name)) = ?
        )
        `,
        [
          userId,
          normalizedName,
          normalizedName
        ]
      )
    const targetIds = Array.from(
      new Set(
        matchingRows.map((row) =>
          Number(row.id)
        )
      )
    ).filter((targetId) =>
      Number.isFinite(targetId)
    )

    if (
      !Number.isFinite(userId) &&
      targetIds.length === 0
    ) {
      throw new Error(
        "Invalid user id for delete."
      )
    }

    const idsToDelete =
      targetIds.length > 0
        ? targetIds
        : [userId]

    for (const currentUserId of idsToDelete) {
      await this.deleteSingleUser(
        currentUserId
      )
    }

    if (normalizedName) {
      await this.db.runAsync(
        `
        DELETE FROM users
        WHERE LOWER(TRIM(name)) = ?
        `,
        [normalizedName]
      )
    }

  }

  private async deleteSingleUser(
    userId: number
  ) {

    await this.db.runAsync(
      `
      DELETE FROM reviews
      WHERE user_id = ?
      `,
      [userId]
    )

    await this.db.runAsync(
      `
      DELETE FROM stats
      WHERE user_id = ?
      `,
      [userId]
    )

    await this.db.runAsync(
      `
      DELETE FROM user_streak
      WHERE user_id = ?
      `,
      [userId]
    )

    await this.db.runAsync(
      `
      DELETE FROM user_badges
      WHERE user_id = ?
      `,
      [userId]
    )

    await this.db.runAsync(
      `
      DELETE FROM user_subjects
      WHERE user_id = ?
      `,
      [userId]
    )

    await this.db.runAsync(
      `
      DELETE FROM user_topics
      WHERE user_id = ?
      `,
      [userId]
    )

    await this.db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = ?
        AND key LIKE 'learn_progress_topic_%'
      `,
      [userId]
    )

    await this.db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = ?
        AND key IN (?, ?)
      `,
      [
        userId,
        `device_registry_user_${userId}`,
        `active_device_key_user_${userId}`
      ]
    )

    await this.db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = ?
        AND (
          key LIKE 'admin_visible_subject_ids_user_%'
          OR key LIKE 'admin_visible_topic_ids_user_%'
        )
      `,
      [userId]
    )

    await this.db.runAsync(
      `
      DELETE FROM sync_meta
      WHERE key = ?
      `,
      [`reviews_last_rev_${userId}`]
    )

    await this.db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = 0
        AND key IN (?, ?)
      `,
      [
        `selected_subject_id_user_${userId}`,
        `selected_topic_id_user_${userId}`
      ]
    )

    await this.db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = 0
        AND key = ?
      `,
      [this.getDisabledSettingKey(userId)]
    )

    await this.db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = 0
        AND key = ?
      `,
      [this.getDisabledSettingKey(userId)]
    )

    await this.db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = ?
        AND key IN (?, ?, ?)
      `,
      [
        userId,
        `streak_current_user_${userId}`,
        `streak_longest_user_${userId}`,
        `streak_last_practice_date_user_${userId}`
      ]
    )

    const adminPathKeys =
      await this.db.getAllAsync<{
        key: string
      }>(
        `
        SELECT key
        FROM settings
        WHERE user_id = 0
          AND key LIKE ?
        `,
        [`admin_selected_topic_path_${userId}:%`]
      )

    for (const row of adminPathKeys) {
      await this.db.runAsync(
        `
        DELETE FROM settings
        WHERE user_id = 0
          AND key = ?
        `,
        [row.key]
      )
    }

    const activeUser =
      await this.db.getFirstAsync<{
        value: string
      }>(
        `
        SELECT value
        FROM settings
        WHERE user_id = 0
          AND key = 'active_user'
        `
      )

    if (String(activeUser?.value ?? "") === String(userId)) {
      await this.db.runAsync(
        `
        UPDATE settings
        SET value = NULL
        WHERE user_id = 0
          AND key = 'active_user'
        `,
        []
      )
    }

    await this.db.runAsync(
      `
      DELETE FROM users
      WHERE id = ?
      `,
      [userId]
    )
  }

  async setUserDisabled(
    id: number,
    disabled: boolean,
    name?: string
  ) {

    const userId = Number(id)
    const normalizedName =
      name?.trim().toLowerCase() ?? ""
    const matchingRows =
      await this.db.getAllAsync<{
        id: number
      }>(
        `
        SELECT COALESCE(id, rowid) as id
        FROM users
        WHERE id = ?
        OR (
          ? != ''
          AND LOWER(TRIM(name)) = ?
        )
        `,
        [
          userId,
          normalizedName,
          normalizedName
        ]
      )
    const targetIds = Array.from(
      new Set(
        matchingRows.map((row) =>
          Number(row.id)
        )
      )
    ).filter((targetId) =>
      Number.isFinite(targetId)
    )

    if (
      !Number.isFinite(userId) &&
      targetIds.length === 0
    ) {
      throw new Error(
        "Invalid user id for disable."
      )
    }

    const idsToUpdate =
      targetIds.length > 0
        ? targetIds
        : [userId]

    for (const currentUserId of idsToUpdate) {
      await this.db.runAsync(
        `
        UPDATE users
        SET disabled = ?
        WHERE id = ?
        `,
        [disabled ? 1 : 0, currentUserId]
      )

      await this.db.runAsync(
        `
        INSERT INTO settings (
          user_id,
          key,
          value,
          updated_at
        )
        VALUES (0, ?, ?, ?)
        ON CONFLICT(user_id, key)
        DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
        `,
        [
          this.getDisabledSettingKey(currentUserId),
          disabled ? "1" : "0",
          Date.now()
        ]
      )
    }

    if (normalizedName) {
      await this.db.runAsync(
        `
        UPDATE users
        SET disabled = ?
        WHERE LOWER(TRIM(name)) = ?
        `,
        [disabled ? 1 : 0, normalizedName]
      )
    }

    if (disabled) {
      for (const currentUserId of idsToUpdate) {
        await this.db.runAsync(
          `
          UPDATE settings
          SET value = NULL
          WHERE user_id = 0
            AND key = 'active_user'
            AND value = ?
          `,
          [String(currentUserId)]
        )
      }
    }

  }

  private getDisabledSettingKey(userId: number) {
    return `user_disabled_user_${userId}`
  }

}
