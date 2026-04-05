import { useCallback, useEffect, useRef } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { SQLiteDatabase } from "expo-sqlite"

import {
  getSyncDirtyAt,
  subscribeSyncMetaChanges
} from "@/database/syncMetaRepository"
import { SyncService } from "@/services/syncService"
import { SyncLifecycle } from "@/services/sync/syncLifecycle"

export function useSyncLifecycle(
  db: SQLiteDatabase | null,
  activeUser: number | null,
  userIds: number[],
  intervalMs: number,
  minGapMs: number
) {

  const lifecycleRef =
    useRef<SyncLifecycle | null>(null)
  const intervalRef =
    useRef<ReturnType<typeof setInterval> | null>(null)
  const userIdsRef =
    useRef<number[]>(userIds)
  const appStateRef =
    useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    userIdsRef.current = userIds
  }, [userIds])

  useEffect(() => {

    if (!db || !activeUser) {
      lifecycleRef.current?.stop()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      lifecycleRef.current = null
      return
    }

    const syncService =
      new SyncService(db, activeUser)
    const lifecycle = new SyncLifecycle(
      syncService,
      () => userIdsRef.current.length > 0
        ? userIdsRef.current
        : activeUser
          ? [activeUser]
          : [],
      intervalMs,
      minGapMs
    )

    lifecycleRef.current = lifecycle
    lifecycle.start(activeUser)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (intervalMs > 0) {
      intervalRef.current = setInterval(() => {
        lifecycle.requestSync("timer")
      }, intervalMs)
    }

    const appStateSubscription =
      AppState.addEventListener(
        "change",
        (nextState) => {
          const previousState =
            appStateRef.current
          appStateRef.current = nextState

          const becameActive =
            /inactive|background/.test(
              previousState
            ) && nextState === "active"

          const goingInactive =
            nextState === "background" ||
            nextState === "inactive"

          if (becameActive) {
            lifecycle.requestSync("appstate")
          }

          if (goingInactive) {
            lifecycle.requestSync("background")
          }
        }
      )

    const syncMetaSubscription =
      subscribeSyncMetaChanges(async () => {
        if (!db || !activeUser || intervalMs <= 0) {
          return
        }

        if (lifecycle.isSyncing()) {
          return
        }

        const dirtyAt = await getSyncDirtyAt(
          db,
          activeUser
        )

        if (!dirtyAt || dirtyAt <= 0) {
          return
        }

        lifecycle.requestSync("dirty")
      })

    if (appStateRef.current === "active") {
      lifecycle.requestSync("startup")
    }

    return () => {
      lifecycle.stop()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      appStateSubscription.remove()
      syncMetaSubscription()
      lifecycleRef.current = null
    }

  }, [db, activeUser, intervalMs, minGapMs])

  const requestSync = useCallback(
    (reason = "manual") => {
      lifecycleRef.current?.requestSync(
        reason
      )
    },
    []
  )

  return {
    requestSync
  }

}
