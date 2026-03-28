import { SQLiteDatabase } from "expo-sqlite"
import { UserSubjectRepository } from "./userSubjectRepository"

export async function resetUserData(
  db: SQLiteDatabase,
  userId: number
) {

  await db.execAsync("BEGIN")

  try {
    await db.runAsync(
      `
      DELETE FROM reviews
      WHERE user_id = ?
      `,
      [userId]
    )

    await db.runAsync(
      `
      DELETE FROM stats
      WHERE user_id = ?
      `,
      [userId]
    )

    await db.runAsync(
      `
      DELETE FROM user_streak
      WHERE user_id = ?
      `,
      [userId]
    )

    await db.runAsync(
      `
      DELETE FROM user_badges
      WHERE user_id = ?
      `,
      [userId]
    )

    await db.runAsync(
      `
      DELETE FROM user_topics
      WHERE user_id = ?
      `,
      [userId]
    )

    await db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = ?
        AND key LIKE 'learn_progress_topic_%'
      `,
      [userId]
    )

    await db.runAsync(
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

    await db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = 0
        AND key = ?
      `,
      [`user_disabled_user_${userId}`]
    )

    await db.runAsync(
      `
      DELETE FROM sync_meta
      WHERE key = ?
      `,
      [`reviews_last_rev_${userId}`]
    )

    await db.runAsync(
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

    const activeUser =
      await db.getFirstAsync<{ value: string }>(
        `
        SELECT value
        FROM settings
        WHERE user_id = 0
          AND key = 'active_user'
        `
      )

    if (Number(activeUser?.value ?? "0") === userId) {
      await db.runAsync(
        `
        INSERT INTO settings (user_id, key, value)
        VALUES (0, 'active_user', NULL)
        ON CONFLICT(user_id, key)
        DO UPDATE SET value = excluded.value
        `
      )
    }

    const permissions =
      new UserSubjectRepository(db)

    await permissions.grantAllSubjects(userId)
    await permissions.grantAllTopics(userId)

    await db.execAsync("COMMIT")
  } catch (error) {
    await db.execAsync("ROLLBACK")
    throw error
  }

}

export async function resetMasterDatabase(
  db: SQLiteDatabase
) {

  await db.execAsync("BEGIN")

  try {
    for (const table of [
      "user_badges",
      "user_streak",
      "stats",
      "reviews",
      "user_topics",
      "sync_meta"
    ]) {
      await db.execAsync(
        `DELETE FROM ${table}`
      )
    }

    await db.runAsync(
      `
      DELETE FROM settings
      WHERE user_id = 0
        AND key IN (
          'active_user',
          'selected_subject_id',
          'selected_topic_id'
        )
      `
    )

    await db.runAsync(
      `
      DELETE FROM settings
      WHERE key LIKE 'learn_progress_topic_%'
         OR key LIKE 'admin_visible_subject_ids_user_%'
         OR key LIKE 'admin_visible_topic_ids_user_%'
         OR key LIKE 'user_disabled_user_%'
      `
    )

    const permissions =
      new UserSubjectRepository(db)
    const userRows =
      await db.getAllAsync<{ id: number }>(
        `
        SELECT id
        FROM users
        `
      )

    for (const user of userRows) {
      await permissions.grantAllSubjects(user.id)
      await permissions.grantAllTopics(user.id)
    }

    await db.execAsync("COMMIT")
  } catch (error) {
    await db.execAsync("ROLLBACK")
    throw error
  }

}
