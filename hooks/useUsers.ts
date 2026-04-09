import { SQLiteDatabase } from "expo-sqlite"
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react"
import { useFocusEffect } from "@react-navigation/native"

import { UserController } from "../controllers/userController"
import { UserSubjectRepository } from "@/database/userSubjectRepository"
import { SyncService } from "@/services/syncService"
import {
  DEFAULT_CURRICULUM_SUBJECTS,
  DEFAULT_CURRICULUM_TOPIC_KEYS
} from "@/config/curriculum"
import {
  markPermissionsDirty,
  markSyncDirty,
} from "@/database/syncMetaRepository"

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
  const [hydrated, setHydrated] =
    useState(false)
  const loadTokenRef = useRef(0)

  const load = useCallback(async () => {

    if (!db) return

    const loadToken = ++loadTokenRef.current

    try {
      const controller =
        new UserController(db)

      const list =
        await controller.getUsers(
          includeDisabled
        )

      if (loadToken !== loadTokenRef.current) {
        return
      }

      const active =
        await controller.getActiveUser()

      if (loadToken !== loadTokenRef.current) {
        return
      }

      setUsers(list)

      setActiveUser(active)
      setHydrated(true)
    } catch (error) {
      console.warn(
        "Failed to load users:",
        error
      )
      if (loadToken === loadTokenRef.current) {
        setUsers([])
        setActiveUser(null)
        setHydrated(true)
      }
    } finally {
      if (loadToken === loadTokenRef.current) {
        setLoading(false)
      }
    }

  }, [db, includeDisabled])

  useEffect(() => {

    if (!db) {
      setUsers([])
      setActiveUser(null)
      setLoading(false)
      setHydrated(false)
      return
    }

    setLoading(true)

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
    await permissionsRepo.savePermissionSnapshots(
      userId
    )
    await markSyncDirty(
      db,
      Number(userId)
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

    await markSyncDirty(
      db,
      activeUser ?? id
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

    await controller.setActiveUser(id)

    setActiveUser(id)

  }

  async function logoutCurrentUser() {

    if (!db) return

    if (activeUser != null) {
      try {
        await new SyncService(
          db,
          activeUser
        ).sync()
      } catch (error) {
        console.warn(
          "Logout sync timed out or failed, continuing with logout:",
          error
        )
      }
    }

    const controller =
      new UserController(db)

    await controller.setActiveUser(null)

    setActiveUser(null)

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
    await repository.savePermissionSnapshots(userId)
    await markPermissionsDirty(
      db,
      userId
    )
    await markSyncDirty(
      db,
      userId
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
    await repository.savePermissionSnapshots(userId)
    await markPermissionsDirty(
      db,
      userId
    )
    await markSyncDirty(
      db,
      userId
    )
  }

  return {
    users,
    activeUser,
    loading,
    hydrated,
    createUser,
    deleteUser,
    setUserDisabled,
    selectUser,
    getSubjectsForUser,
    setSubjectEnabled,
    getTopicsForUser,
    setTopicEnabled,
    logoutCurrentUser,
    reload: load
  }

}
