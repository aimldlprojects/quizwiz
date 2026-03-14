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

  try {

    await pushReviews(db, serverUrl, userId)

    await pullReviews(db, serverUrl, userId)

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
      message
    )

    console.error("Review sync failed:", err)

    throw err

  }

}
