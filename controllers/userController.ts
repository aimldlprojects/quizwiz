import { SQLiteDatabase } from "expo-sqlite"

import { UserRepository } from "../database/userRepository"
import { UserSettingsRepository } from "../database/userSettingsRepository"

export class UserController {

  private userRepo: UserRepository
  private settingsRepo: UserSettingsRepository

  constructor(db: SQLiteDatabase) {

    this.userRepo =
      new UserRepository(db)

    this.settingsRepo =
      new UserSettingsRepository(db)

  }

  /*
  --------------------------------------------------
  Get Users
  --------------------------------------------------
  */

  async getUsers(
    includeDisabled = false
  ) {

    return includeDisabled
      ? this.userRepo.getUsersByStatus(true)
      : this.userRepo.getUsers()

  }

  /*
  --------------------------------------------------
  Create User
  --------------------------------------------------
  */

  async createUser(
    name: string
  ) {

    return this.userRepo.createUser(
      name
    )

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

    await this.userRepo.deleteUser(
      id,
      name
    )

  }

  async setUserDisabled(
    id: number,
    disabled: boolean,
    name?: string
  ) {

    await this.userRepo.setUserDisabled(
      id,
      disabled,
      name
    )

  }

  /*
  --------------------------------------------------
  Active User
  --------------------------------------------------
  */

  async getActiveUser() {

    return this.settingsRepo
      .getActiveUser()

  }

  async setActiveUser(
    userId: number
  ) {

    await this.settingsRepo
      .setActiveUser(userId)

  }

}
