import { SQLiteDatabase } from "expo-sqlite"
import { useEffect, useState } from "react"

import { UserController } from "../controllers/userController"

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

    await controller.setActiveUser(id)

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