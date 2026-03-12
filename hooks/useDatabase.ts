import * as SQLite from "expo-sqlite"
import { useEffect, useState } from "react"

import { initDB } from "@/database/initDB"
import { getSyncMode } from "@/database/settingsRepository"
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

      try {

        await pullReviews(
          database,
          "http://YOUR_SERVER_IP:8000",
          1
        )

      } catch (err) {

        console.log(
          "Initial sync failed:",
          err
        )

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