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
  userId: number,
  options?: {
    showOverlay?: boolean
    overlayLabel?: string
  }
): Promise<void> {

  let stage: "push" | "pull" | "overall" = "overall"
  const showOverlay =
    options?.showOverlay !== false
  const overlayLabel =
    options?.overlayLabel ?? "Syncing current profile..."
  const overlayDelayMs = 150
  let overlayShown = false
  let overlayTimer: ReturnType<typeof setTimeout> | null = null

  if (showOverlay) {
    overlayTimer = setTimeout(() => {
      overlayShown = true
      beginSyncActivity(overlayLabel)
    }, overlayDelayMs)
  }

  try {

    stage = "push"
    await pushReviews(db, serverUrl, userId, {
      showOverlay: false
    })
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
    await pullReviews(db, serverUrl, userId, {
      showOverlay: false
    })
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
    if (overlayTimer) {
      clearTimeout(overlayTimer)
      overlayTimer = null
    }
    if (showOverlay && overlayShown) {
      endSyncActivity()
    }

  }

}
