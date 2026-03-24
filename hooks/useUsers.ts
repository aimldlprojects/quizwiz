import { SQLiteDatabase } from "expo-sqlite"
import { useCallback, useEffect, useState } from "react"
import { useFocusEffect } from "@react-navigation/native"

import { UserController } from "../controllers/userController"
import { getSyncMode } from "@/database/settingsRepository"
import { getSyncServerUrl } from "@/services/sync/config"
import { pullReviews } from "@/services/sync/pullReviews"
import { pushReviews } from "@/services/sync/pushReviews"
import { UserSubjectRepository } from "@/database/userSubjectRepository"
import {
  DEFAULT_CURRICULUM_SUBJECTS,
  DEFAULT_CURRICULUM_TOPIC_KEYS
} from "@/config/curriculum"

export interface User {
  id: number
  name: string
  disabled: number
}

export function useUsers(
  db: SQLiteDatabase | null,
  includeDisabled = false
) {

  const [users, setUsers] =
    useState<User[]>([])

  const [activeUser, setActiveUser] =
    useState<number | null>(null)

  const [loading, setLoading] =
    useState(true)

  const load = useCallback(async () => {

    if (!db) return

    const controller =
      new UserController(db)

    const list =
      await controller.getUsers(
        includeDisabled
      )

    const active =
      await controller.getActiveUser()

    setUsers(list)

    setActiveUser(active)

    setLoading(false)

  }, [db, includeDisabled])

  useEffect(() => {

    if (!db) return

    load()

  }, [db, load])

  useFocusEffect(useCallback(() => {

    if (!db) {
      return
    }

    load()
  }, [db, load]))

  async function createUser(
    name: string
  ) {

    if (!db) return

    const controller =
      new UserController(db)
    const permissionsRepo =
      new UserSubjectRepository(db)

    const userId =
      await controller.createUser(name)

    setUsers((current) => [
      ...current,
      {
        id: Number(userId),
        name,
        disabled: 0
      }
    ])

    await permissionsRepo.grantSubjectsByName(
      userId,
      [...DEFAULT_CURRICULUM_SUBJECTS]
    )
    await permissionsRepo.grantTopicsByKeys(
      userId,
      [...DEFAULT_CURRICULUM_TOPIC_KEYS]
    )

    await load()

  }

  async function deleteUser(
    id: number,
    name?: string
  ) {

    if (!db) return

    const controller =
      new UserController(db)

    await controller.deleteUser(id, name)

    await load()

  }

  async function setUserDisabled(
    id: number,
    disabled: boolean,
    name?: string
  ) {

    if (!db) return

    const controller =
      new UserController(db)

    await controller.setUserDisabled(
      id,
      disabled,
      name
    )

    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? {
              ...user,
              disabled: disabled ? 1 : 0
            }
          : user
      )
    )

    if (disabled && activeUser === id) {
      setActiveUser(null)
    }

    try {
      await load()
    } catch (error) {
      console.error(
        "Failed to refresh users after disable toggle:",
        error
      )
    }

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
      try {
        await pushReviews(
          db,
          serverUrl,
          previousUser
        )
      } catch (error) {
        console.error(
          "Failed to push reviews before switching user:",
          error
        )
      }
    }

    await controller.setActiveUser(id)

    if (mode === "hybrid" && serverUrl) {
      try {
        await pullReviews(
          db,
          serverUrl,
          id
        )
      } catch (error) {
        console.error(
          "Failed to pull reviews after switching user:",
          error
        )
      }
    }

    setActiveUser(id)

  }

  async function getSubjectsForUser(
    userId: number
  ) {

    if (!db) return []

    const repository =
      new UserSubjectRepository(db)

    return repository.getSubjectsForUser(userId)

  }

  async function setSubjectEnabled(
    userId: number,
    subjectId: number,
    enabled: boolean
  ) {

    if (!db) return

    const repository =
      new UserSubjectRepository(db)

    await repository.setSubjectEnabled(
      userId,
      subjectId,
      enabled
    )

    await repository.setTopicsForSubjectEnabled(
      userId,
      subjectId,
      enabled
    )
  }

  async function getTopicsForUser(
    userId: number,
    subjectId: number
  ) {

    if (!db) return []

    const repository =
      new UserSubjectRepository(db)

    return repository.getTopicsForUser(
      userId,
      subjectId
    )

  }

  async function setTopicEnabled(
    userId: number,
    topicId: number,
    enabled: boolean
  ) {

    if (!db) return

    const repository =
      new UserSubjectRepository(db)

    await repository.setTopicEnabled(
      userId,
      topicId,
      enabled
    )
  }

  return {
    users,
    activeUser,
    loading,
    createUser,
    deleteUser,
    setUserDisabled,
    selectUser,
    getSubjectsForUser,
    setSubjectEnabled,
    getTopicsForUser,
    setTopicEnabled,
    reload: load
  }

}
