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
  console.log("[NAV_DEBUG useDatabase] getSharedDatabase:start", JSON.stringify({
    hasSharedDb: !!sharedDb,
    hasSharedDbPromise: !!sharedDbPromise
  }))

  if (sharedDb) {
    const usable = await isDatabaseUsable(sharedDb)
    console.log("[NAV_DEBUG useDatabase] getSharedDatabase:existing", JSON.stringify({
      usable
    }))

    if (usable) {
      return sharedDb
    }

    sharedDb = null
    sharedDbPromise = null
  }

  if (!sharedDbPromise) {
    console.log("[NAV_DEBUG useDatabase] getSharedDatabase:opening")
    sharedDbPromise = initializeDatabase().catch(
      (err) => {
        console.warn("[NAV_DEBUG useDatabase] getSharedDatabase:open-failed", err)
        sharedDbPromise = null
        throw err
      }
    )
  }

  sharedDb = await sharedDbPromise
  console.log("[NAV_DEBUG useDatabase] getSharedDatabase:resolved", JSON.stringify({
    hasSharedDb: !!sharedDb
  }))
  const usable = await isDatabaseUsable(sharedDb)
  console.log("[NAV_DEBUG useDatabase] getSharedDatabase:post-usability", JSON.stringify({
    usable
  }))

  if (!usable) {
    console.log("[NAV_DEBUG useDatabase] getSharedDatabase:reopen")
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
  console.log("[NAV_DEBUG useDatabase] initializeDatabase:open", JSON.stringify({
    platform: String(SQLite)
  }))
  const database =
    await SQLite.openDatabaseAsync("quizwiz.db")
  console.log("[NAV_DEBUG useDatabase] initializeDatabase:opened")

  reportStage(StageIndex.APPLY_SCHEMA)
  console.log("[NAV_DEBUG useDatabase] initializeDatabase:initDB:start")
  await initDB(database)
  console.log("[NAV_DEBUG useDatabase] initializeDatabase:initDB:done")

  reportStage(StageIndex.SYNC_MODE)
  console.log("[NAV_DEBUG useDatabase] initializeDatabase:getSyncMode:start")
  await getSyncMode(database)
  console.log("[NAV_DEBUG useDatabase] initializeDatabase:getSyncMode:done")

  reportConnectivity(null)
  reportStage(StageIndex.FINALIZE)
  console.log("[NAV_DEBUG useDatabase] initializeDatabase:done")
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
    console.log("[NAV_DEBUG useDatabase] init:start")

    try {
      const database =
        await getSharedDatabase()

      console.log("[NAV_DEBUG useDatabase] init:setDb", JSON.stringify({
        hasDatabase: !!database
      }))
      setDb(database)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : String(err)
      console.warn("[NAV_DEBUG useDatabase] init:error", message)

      setError(message)
    } finally {
      setLoading(false)
      console.log("[NAV_DEBUG useDatabase] init:end")
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
