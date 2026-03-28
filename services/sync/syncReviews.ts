import { SQLiteDatabase } from "expo-sqlite"

import {
  clearSyncDirty,
  beginSyncActivity,
  endSyncActivity,
  setSyncStatus as setSyncMetaStatus
} from "../../database/syncMetaRepository"
import { pullReviews } from "./pullReviews"
import { pushReviews } from "./pushReviews"
import {
  setSyncStatus as setGlobalSyncStatus
} from "@/database/syncStatusRepository"

/*
--------------------------------------------------
Sync Reviews (Push → Pull)
--------------------------------------------------
*/

async function recordGlobalStatus(
  db: SQLiteDatabase,
  status: "success" | "failed",
  message: string | null,
  direction: "overall" | "push" | "pull"
) {
  await setGlobalSyncStatus(
    db,
    status,
    message,
    Date.now(),
    direction
  )
}

export async function syncReviews(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number
): Promise<void> {

  let stage: "push" | "pull" | "overall" = "overall"

  beginSyncActivity()
  try {

    stage = "push"
    await pushReviews(db, serverUrl, userId)
    await setSyncMetaStatus(
      db,
      userId,
      "success",
      Date.now()
    )
    await recordGlobalStatus(
      db,
      "success",
      "Push completed",
      "push"
    )

    stage = "pull"
    await pullReviews(db, serverUrl, userId)
    await setSyncMetaStatus(
      db,
      userId,
      "success",
      Date.now()
    )
    await recordGlobalStatus(
      db,
      "success",
      "Pull completed",
      "pull"
    )

    stage = "overall"
    await setSyncMetaStatus(
      db,
      userId,
      "success",
      Date.now()
    )
    await recordGlobalStatus(
      db,
      "success",
      "Sync completed",
      "overall"
    )
    await clearSyncDirty(db, userId)

  } catch (err) {

    const message =
      err instanceof Error
        ? err.message
        : "Unknown error"

    const stageMessage =
      stage !== "overall"
        ? `[${stage}] ${message}`
        : message

    await setSyncMetaStatus(
      db,
      userId,
      "failed",
      Date.now(),
      stageMessage
    )

    await recordGlobalStatus(
      db,
      "failed",
      stageMessage,
      stage
    )

    console.error("Review sync failed:", err)

    throw err

  } finally {
    endSyncActivity()
  }

}
