import { SQLiteDatabase } from "expo-sqlite"

export interface User {
  id: number
  name: string
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

    const rows =
      await this.db.getAllAsync<User>(
        `
        SELECT id,name
        FROM users
        ORDER BY id
        `
      )

    return rows

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
        SELECT id,name
        FROM users
        WHERE id = ?
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

    await this.db.runAsync(
      `
      INSERT INTO users(name)
      VALUES(?)
      `,
      [name]
    )

  }

  /*
  --------------------------------------------------
  Delete User
  --------------------------------------------------
  */

  async deleteUser(
    id: number
  ) {

    await this.db.runAsync(
      `
      DELETE FROM users
      WHERE id = ?
      `,
      [id]
    )

  }

}