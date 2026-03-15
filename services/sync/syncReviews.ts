import { SQLiteDatabase } from "expo-sqlite"

import { setSyncStatus } from "../../database/syncMetaRepository"
import { pullReviews } from "./pullReviews"
import { pushReviews } from "./pushReviews"

/*
--------------------------------------------------
Sync Reviews (Push → Pull)
--------------------------------------------------
*/

export async function syncReviews(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number
): Promise<void> {

  let stage: "push" | "pull" | "overall" = "overall"

  try {

    stage = "push"
    await pushReviews(db, serverUrl, userId)
    await setSyncStatus(
      db,
      userId,
      "success",
      Date.now()
    )

    stage = "pull"
    await pullReviews(db, serverUrl, userId)
    await setSyncStatus(
      db,
      userId,
      "success",
      Date.now()
    )

    stage = "overall"
    await setSyncStatus(
      db,
      userId,
      "success",
      Date.now()
    )

  } catch (err) {

    const message =
      err instanceof Error
        ? err.message
        : "Unknown error"

    const stageMessage =
      stage !== "overall"
        ? `[${stage}] ${message}`
        : message

    await setSyncStatus(
      db,
      userId,
      "failed",
      Date.now(),
      stageMessage
    )

    console.error("Review sync failed:", err)

    throw err

  }

}
