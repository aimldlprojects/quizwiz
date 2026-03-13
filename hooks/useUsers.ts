import { SQLiteDatabase } from "expo-sqlite"
import { useEffect, useState } from "react"

import { UserController } from "../controllers/userController"
import { getSyncMode } from "@/database/settingsRepository"
import { getSyncServerUrl } from "@/services/sync/config"
import { pullReviews } from "@/services/sync/pullReviews"
import { pushReviews } from "@/services/sync/pushReviews"

export interface User {
  id: number
  name: string
}

export function useUsers(
  db: SQLiteDatabase | null
) {

  const [users, setUsers] =
    useState<User[]>([])

  const [activeUser, setActiveUser] =
    useState<number | null>(null)

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {

    if (!db) return

    load()

  }, [db])

  async function load() {

    if (!db) return

    const controller =
      new UserController(db)

    const list =
      await controller.getUsers()

    const active =
      await controller.getActiveUser()

    setUsers(list)

    setActiveUser(active)

    setLoading(false)

  }

  async function createUser(
    name: string
  ) {

    if (!db) return

    const controller =
      new UserController(db)

    await controller.createUser(name)

    await load()

  }

  async function deleteUser(
    id: number
  ) {

    if (!db) return

    const controller =
      new UserController(db)

    await controller.deleteUser(id)

    await load()

  }

  async function selectUser(
    id: number
  ) {

    if (!db) return

    const controller =
      new UserController(db)

    const previousUser = activeUser
    const mode =
      await getSyncMode(db)
    const serverUrl =
      getSyncServerUrl()

    if (
      mode === "hybrid" &&
      serverUrl &&
      previousUser
    ) {
      await pushReviews(
        db,
        serverUrl,
        previousUser
      )
    }

    await controller.setActiveUser(id)

    if (mode === "hybrid" && serverUrl) {
      await pullReviews(
        db,
        serverUrl,
        id
      )
    }

    setActiveUser(id)

  }

  return {
    users,
    activeUser,
    loading,
    createUser,
    deleteUser,
    selectUser
  }

}
