import { SQLiteDatabase } from "expo-sqlite"
import { useCallback, useEffect, useState } from "react"

import { markSyncDirty } from "@/database/syncMetaRepository"
import {
    getSyncMode,
    setSyncMode,
    getSyncIntervalMs,
    setSyncIntervalMs,
    getSyncMinGapMs,
    setSyncMinGapMs,
    SyncMode
} from "@/database/settingsRepository"

const MIN_SYNC_INTERVAL_MS = 15_000
const MIN_SYNC_GAP_MS = 5_000

export function useSettings(
  db: SQLiteDatabase | null,
  syncOwnerUserId: number | null = null
) {

  const [syncMode, setMode] =
    useState<SyncMode>("local")

  const [syncIntervalMs, setIntervalMs] =
    useState(60_000)

  const [syncMinGapMs, setMinGapMs] =
    useState(30_000)

  const [loading, setLoading] =
    useState(true)

  const load = useCallback(async () => {

    if (!db) return

    const [
      mode,
      interval,
      gap
    ] = await Promise.all([
      getSyncMode(db),
      getSyncIntervalMs(db),
      getSyncMinGapMs(db)
    ])

    setMode(mode)
    setIntervalMs(Math.max(interval, MIN_SYNC_INTERVAL_MS))
    setMinGapMs(Math.max(gap, MIN_SYNC_GAP_MS))

    setLoading(false)

  }, [db])

  useEffect(() => {

    if (!db) return

    load()

  }, [db, load])

  async function updateSyncMode(
    mode: SyncMode
  ) {

    if (!db) return

    await setSyncMode(
      db,
      mode
    )
    if (syncOwnerUserId != null) {
      await markSyncDirty(
        db,
        syncOwnerUserId,
        Date.now()
      )
    }

    setMode(mode)

  }

  async function updateSyncIntervalMs(
    value: number
  ) {
    if (!db) return

    const normalized = Math.max(
      value,
      MIN_SYNC_INTERVAL_MS
    )

    await setSyncIntervalMs(
      db,
      normalized
    )
    if (syncOwnerUserId != null) {
      await markSyncDirty(
        db,
        syncOwnerUserId,
        Date.now()
      )
    }

    setIntervalMs(normalized)

  }

  async function updateSyncMinGapMs(
    value: number
  ) {
    if (!db) return

    const normalized = Math.max(
      value,
      MIN_SYNC_GAP_MS
    )

    await setSyncMinGapMs(
      db,
      normalized
    )
    if (syncOwnerUserId != null) {
      await markSyncDirty(
        db,
        syncOwnerUserId,
        Date.now()
      )
    }

    setMinGapMs(normalized)

  }

  return {
    syncMode,
    updateSyncMode,
    syncIntervalMs,
    syncMinGapMs,
    updateSyncIntervalMs,
    updateSyncMinGapMs,
    loading
  }

}
