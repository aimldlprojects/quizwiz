import * as SQLite from "expo-sqlite"
import { useEffect, useState } from "react"

import { initDB } from "@/database/initDB"
import { getSyncMode } from "@/database/settingsRepository"

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
}

function reportConnectivity(message: string | null) {
  if (!connectivityReporter) {
    return
  }

  connectivityReporter(message)
}

async function getSharedDatabase() {

  if (sharedDb) {
    const usable = await isDatabaseUsable(sharedDb)

    if (usable) {
      return sharedDb
    }

    sharedDb = null
    sharedDbPromise = null
  }

  if (!sharedDbPromise) {
    sharedDbPromise = initializeDatabase().catch(
      (err) => {
        sharedDbPromise = null
        throw err
      }
    )
  }

  sharedDb = await sharedDbPromise
  const usable = await isDatabaseUsable(sharedDb)

  if (!usable) {
    sharedDb = null
    sharedDbPromise = null
    sharedDb = await initializeDatabase()
  }

  return sharedDb

}

async function isDatabaseUsable(
  database: SQLite.SQLiteDatabase
) {
  try {
    await database.getFirstAsync(
      "SELECT 1 AS ok"
    )
    return true
  } catch {
    return false
  }
}

async function initializeDatabase() {

  reportStage(StageIndex.OPEN)
  const database =
    await SQLite.openDatabaseAsync("quizwiz.db")

  reportStage(StageIndex.APPLY_SCHEMA)
  await initDB(database)

  reportStage(StageIndex.SYNC_MODE)
  await getSyncMode(database)

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
