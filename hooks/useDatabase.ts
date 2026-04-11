import * as SQLite from "expo-sqlite"
import { useEffect, useState } from "react"

import { BOOTSTRAP_STAGE_LABELS } from "@/config/bootstrap"
import { initDB } from "@/database/initDB"
import { getSyncMode } from "@/database/settingsRepository"

type BootstrapState = {
  db: SQLite.SQLiteDatabase | null
  loading: boolean
  stageIndex: number
  error: string | null
  connectivityStatus: string | null
}

const initialBootstrapState: BootstrapState = {
  db: null,
  loading: true,
  stageIndex: 0,
  error: null,
  connectivityStatus: null
}

let bootstrapState: BootstrapState = {
  ...initialBootstrapState
}

const bootstrapSubscribers = new Set<
  (state: BootstrapState) => void
>()

let sharedDb: SQLite.SQLiteDatabase | null = null
let sharedDbPromise: Promise<SQLite.SQLiteDatabase> | null =
  null

const StageIndex = {
  OPEN: 0,
  APPLY_SCHEMA: 1,
  SYNC_MODE: 2,
  CHECK_SERVER: 3,
  SYNC_REVIEWS: 4,
  FINALIZE: 5
} as const

function emitBootstrapState(
  patch: Partial<BootstrapState>
) {
  bootstrapState = {
    ...bootstrapState,
    ...patch
  }

  for (const subscriber of bootstrapSubscribers) {
    subscriber(bootstrapState)
  }
}

function reportStage(index: number) {
  emitBootstrapState({
    stageIndex: Math.min(
      Math.max(index, 0),
      BOOTSTRAP_STAGE_LABELS.length - 1
    )
  })
}

function reportConnectivity(message: string | null) {
  emitBootstrapState({
    connectivityStatus: message
  })
}

async function isDatabaseUsable(
  database: SQLite.SQLiteDatabase
) {
  try {
    await database.getFirstAsync("SELECT 1 AS ok")
    return true
  } catch {
    return false
  }
}

async function initializeDatabase() {
  reportStage(StageIndex.OPEN)
  const database = SQLite.openDatabaseSync("quizwiz.db")

  reportStage(StageIndex.APPLY_SCHEMA)
  await initDB(database)

  reportStage(StageIndex.SYNC_MODE)
  await getSyncMode(database)

  reportConnectivity(null)
  reportStage(StageIndex.FINALIZE)
  return database
}

async function ensureSharedDatabase() {
  if (sharedDb) {
    const usable = await isDatabaseUsable(sharedDb)
    if (usable) {
      return sharedDb
    }

    sharedDb = null
    sharedDbPromise = null
  }

  if (!sharedDbPromise) {
    emitBootstrapState({
      loading: true,
      error: null,
      stageIndex: 0,
      connectivityStatus: null
    })

    sharedDbPromise = initializeDatabase()
      .then((database) => {
        sharedDb = database
        emitBootstrapState({
          db: database,
          loading: false,
          error: null
        })
        return database
      })
      .catch((err) => {
        sharedDb = null
        const message =
          err instanceof Error
            ? err.message
            : String(err)

        emitBootstrapState({
          loading: false,
          error: message
        })

        throw err
      })
      .finally(() => {
        sharedDbPromise = null
      })
  }

  return sharedDbPromise
}

export function useDatabase() {
  const [state, setState] =
    useState<BootstrapState>(() => bootstrapState)

  useEffect(() => {
    bootstrapSubscribers.add(setState)
    setState(bootstrapState)

    void ensureSharedDatabase()

    return () => {
      bootstrapSubscribers.delete(setState)
    }
  }, [])

  const clampedStageIndex = Math.min(
    Math.max(state.stageIndex, 0),
    BOOTSTRAP_STAGE_LABELS.length - 1
  )

  const stageLabel =
    BOOTSTRAP_STAGE_LABELS[clampedStageIndex]

  const progress =
    BOOTSTRAP_STAGE_LABELS.length <= 1
      ? 1
      : clampedStageIndex /
        (BOOTSTRAP_STAGE_LABELS.length - 1)

  return {
    db: state.db,
    loading: state.loading,
    stageLabel,
    progress,
    error: state.error,
    connectivityStatus: state.connectivityStatus
  }
}
