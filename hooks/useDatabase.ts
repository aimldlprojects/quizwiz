import * as SQLite from "expo-sqlite"
import { useEffect, useState } from "react"

import { initDB } from "@/database/initDB"
import { getSyncMode } from "@/database/settingsRepository"
import { getSyncServerUrl } from "@/services/sync/config"
import { pullReviews } from "@/services/sync/pullReviews"
import {
  logSyncConsole,
  logSyncDebug
} from "@/config/logging"

let sharedDb: SQLite.SQLiteDatabase | null =
  null
let sharedDbPromise: Promise<SQLite.SQLiteDatabase> | null =
  null

const STAGE_LABELS = [
  "Opening database",
  "Applying schema & seeding data",
  "Checking sync mode",
  "Checking remote server",
  "Syncing remote reviews",
  "Finalizing setup"
]

const StageIndex = {
  OPEN: 0,
  APPLY_SCHEMA: 1,
  SYNC_MODE: 2,
  CHECK_SERVER: 3,
  SYNC_REVIEWS: 4,
  FINALIZE: 5
} as const

let stageReporter: ((index: number) => void) | null = null
let connectivityReporter: ((message: string | null) => void) | null = null

function reportStage(index: number) {
  if (!stageReporter) {
    return
  }

  const clamped = Math.min(
    Math.max(index, 0),
    STAGE_LABELS.length - 1
  )
  stageReporter(clamped)
  logSyncConsole(
    `startup stage: ${STAGE_LABELS[clamped]} (${clamped})`
  )
}

function reportConnectivity(message: string | null) {
  if (!connectivityReporter) {
    return
  }

  connectivityReporter(message)
  logSyncConsole(
    `connectivity: ${
      message ?? "online"
    }`
  )
}

async function checkServerConnectivity(
  serverUrl: string,
  userId: number
) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, 2500)

    const url = new URL(`${serverUrl}/reviews/status`)
    url.searchParams.set("user_id", String(userId))

    const response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal
    })

    clearTimeout(timeout)

    return response.ok
  } catch (err) {
    return false
  }
}

async function getSharedDatabase() {

  if (sharedDb) {
    return sharedDb
  }

  if (!sharedDbPromise) {
    sharedDbPromise =
      initializeDatabase()
  }

  sharedDb = await sharedDbPromise
  return sharedDb

}

async function initializeDatabase() {

  let serverUrl: string | null = null
  let finalActiveUser = 0
  let initialSyncPerformed = false

  reportStage(StageIndex.OPEN)
  const database =
    await SQLite.openDatabaseAsync("quizwiz.db")

  reportStage(StageIndex.APPLY_SCHEMA)
  await initDB(database)

  reportStage(StageIndex.SYNC_MODE)
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

      serverUrl =
        getSyncServerUrl()

    if (!serverUrl) {
      console.log(
        "Initial sync skipped: sync server URL is not configured."
      )
      reportConnectivity(
        "Sync server not configured; falling back to offline mode."
      )
    } else {

      try {

        const activeUser =
          Number(
            activeUserRow?.value ?? "0"
          ) || 0

        if (activeUser) {
          finalActiveUser = activeUser
          reportStage(StageIndex.CHECK_SERVER)
          const reachable =
            await checkServerConnectivity(
              serverUrl,
              activeUser
            )

          if (!reachable) {
            console.log(
              "Remote server unreachable; skipping initial pull."
            )
            reportConnectivity(
              "Remote server unreachable; continuing offline."
            )
          } else {
            reportConnectivity(null)
            reportStage(StageIndex.SYNC_REVIEWS)
            logSyncDebug(
              `initial sync pulling reviews for user ${activeUser}`
            )
            await pullReviews(
              database,
              serverUrl,
              activeUser
            )
            logSyncDebug(
              `initial sync @ user ${activeUser} finished`
            )
            initialSyncPerformed = true
          }
        }

      } catch (err) {

        console.log(
          "Initial sync failed:",
          err
        )

        throw err

      }
    }

  }

  logSyncConsole(
    `startup finalizing: mode=${mode}, serverUrlConfigured=${Boolean(
      serverUrl
    )}, activeUser=${finalActiveUser}, initialSyncPerformed=${initialSyncPerformed}`
  )
  reportConnectivity(null)
  reportStage(StageIndex.FINALIZE)
  return database

}

export function useDatabase() {

  const [db, setDb] =
    useState<SQLite.SQLiteDatabase | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [stageIndex, setStageIndex] =
    useState(0)
  const [error, setError] =
    useState<string | null>(null)
  const [connectivityStatus, setConnectivityStatus] =
    useState<string | null>(null)

  const clampedStageIndex = Math.min(
    Math.max(stageIndex, 0),
    STAGE_LABELS.length - 1
  )

  const stageLabel = STAGE_LABELS[clampedStageIndex]

  const progress =
    STAGE_LABELS.length <= 1
      ? 1
      : clampedStageIndex /
        (STAGE_LABELS.length - 1)

  useEffect(() => {

    void init()

  }, [])

  async function init() {

    setError(null)
    setStageIndex(0)
    stageReporter = setStageIndex
    connectivityReporter =
      setConnectivityStatus

    try {
      const database =
        await getSharedDatabase()

      setDb(database)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : String(err)

      setError(message)
    } finally {
      setLoading(false)
      stageReporter = null
      connectivityReporter = null
    }

  }

  return {
    db,
    loading,
    stageLabel,
    progress,
    error,
    connectivityStatus
  }

}
