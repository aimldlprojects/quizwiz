import { SQLiteDatabase } from "expo-sqlite"
import { useEffect, useState } from "react"

import {
    getSyncMode,
    setSyncMode,
    SyncMode
} from "@/database/settingsRepository"

export function useSettings(
  db: SQLiteDatabase | null
) {

  const [syncMode, setMode] =
    useState<SyncMode>("local")

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {

    if (!db) return

    load()

  }, [db])

  async function load() {

    if (!db) return

    const mode =
      await getSyncMode(db)

    setMode(mode)

    setLoading(false)

  }

  async function updateSyncMode(
    mode: SyncMode
  ) {

    if (!db) return

    await setSyncMode(
      db,
      mode
    )

    setMode(mode)

  }

  return {
    syncMode,
    updateSyncMode,
    loading
  }

}