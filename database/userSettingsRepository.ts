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
        WHERE key = 'active_user'
        `
      )

    if (!row) return null

    return Number(row.value)

  }

  /*
  --------------------------------------------------
  Set Active User
  --------------------------------------------------
  */

  async setActiveUser(
    userId: number
  ) {

    await this.db.runAsync(
      `
      INSERT INTO settings(key,value)
      VALUES('active_user',?)

      ON CONFLICT(key)
      DO UPDATE SET
      value = excluded.value
      `,
      [String(userId)]
    )

  }

}