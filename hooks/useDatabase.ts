// hooks/useDatabase.ts

import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite"
import { useEffect, useState } from "react"

import { initDB } from "../database/initDB"

export function useDatabase() {

  const [db, setDb] =
    useState<SQLiteDatabase | null>(null)

  const [ready, setReady] =
    useState(false)

  useEffect(() => {

    async function setup() {

      const database =
        await openDatabaseAsync("quizwiz.db")

      await initDB(database)

      setDb(database)

      setReady(true)

    }

    setup()

  }, [])

  return { db, ready }

}