import { SQLiteDatabase } from "expo-sqlite"

import { setSyncStatus } from "@/database/syncStatusRepository"
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
      "success",
      "Sent updates to the global database.",
      Date.now(),
      "push"
    )

    stage = "pull"
    await pullReviews(db, serverUrl, userId)
    await setSyncStatus(
      db,
      "success",
      "Pulled fresh data from the global database.",
      Date.now(),
      "pull"
    )

    stage = "overall"
    await setSyncStatus(
      db,
      "success",
      "Last sync completed successfully."
    )

  } catch (err) {

    const message =
      err instanceof Error
        ? err.message
        : "Unknown error"

    await setSyncStatus(
      db,
      "failed",
      message,
      Date.now(),
      stage
    )
    await setSyncStatus(
      db,
      "failed",
      message
    )

    console.error("Review sync failed:", err)

    throw err

  }

}
