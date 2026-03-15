import { useCallback, useEffect, useRef } from "react"
import { SQLiteDatabase } from "expo-sqlite"

import { SyncService } from "@/services/syncService"
import { SyncLifecycle } from "@/services/sync/syncLifecycle"

export function useSyncLifecycle(
  db: SQLiteDatabase | null,
  activeUser: number | null,
  intervalMs: number,
  minGapMs: number
) {

  const lifecycleRef =
    useRef<SyncLifecycle | null>(null)

  useEffect(() => {

    if (!db || !activeUser) {
      lifecycleRef.current?.stop()
      lifecycleRef.current = null
      return
    }

    const syncService =
      new SyncService(db, activeUser)
    const lifecycle = new SyncLifecycle(
      db,
      syncService,
      intervalMs,
      minGapMs
    )

    lifecycleRef.current = lifecycle
    lifecycle.start(activeUser)

    return () => {
      lifecycle.stop()
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
