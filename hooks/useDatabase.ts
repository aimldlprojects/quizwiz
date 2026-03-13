import * as SQLite from "expo-sqlite"
import { useEffect, useState } from "react"

import { initDB } from "@/database/initDB"
import { getSyncMode } from "@/database/settingsRepository"
import { getSyncServerUrl } from "@/services/sync/config"
import { pullReviews } from "@/services/sync/pullReviews"

export function useDatabase() {

  const [db, setDb] =
    useState<SQLite.SQLiteDatabase | null>(null)

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {

    init()

  }, [])

  async function init() {

    const database =
      await SQLite.openDatabaseAsync("quizwiz.db")

    await initDB(database)

    const mode =
      await getSyncMode(database)

    if (mode === "hybrid") {

      const activeUserRow =
        await database.getFirstAsync<{
          value: string
        }>(
          `
          SELECT value
          FROM settings
          WHERE key = 'active_user'
          `
        )

      const serverUrl =
        getSyncServerUrl()

      if (!serverUrl) {
        console.log(
          "Initial sync skipped: sync server URL is not configured."
        )
      } else {

        try {

          const activeUser =
            Number(
              activeUserRow?.value ?? "0"
            ) || 0

          if (!activeUser) {
            setDb(database)
            setLoading(false)
            return
          }

          await pullReviews(
            database,
            serverUrl,
            activeUser
          )

        } catch (err) {

          console.log(
            "Initial sync failed:",
            err
          )

        }
      }

    }

    setDb(database)

    setLoading(false)

  }

  return {
    db,
    loading
  }

}
