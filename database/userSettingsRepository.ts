import { SQLiteDatabase } from "expo-sqlite"

export class UserSettingsRepository {

  private db: SQLiteDatabase

  constructor(db: SQLiteDatabase) {
    this.db = db
  }

  /*
  --------------------------------------------------
  Get Active User
  --------------------------------------------------
  */

  async getActiveUser(): Promise<number | null> {

    const row =
      await this.db.getFirstAsync<{ value: string }>(
        `
        SELECT value
        FROM settings
        WHERE user_id = 0
          AND key = 'active_user'
        `
      )

    if (!row || row.value == null) return null

    const parsed = Number(row.value)

    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : null

  }

  /*
  --------------------------------------------------
  Set Active User
  --------------------------------------------------
  */

  async setActiveUser(
    userId: number | null
  ) {

    await this.db.runAsync(
      `
      INSERT INTO settings(user_id,key,value)
      VALUES(0,'active_user',?)

      ON CONFLICT(user_id,key)
      DO UPDATE SET
      value = excluded.value
      `,
      [userId == null ? null : String(userId)]
    )

  }

}
