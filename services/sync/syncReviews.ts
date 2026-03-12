import { SQLiteDatabase } from "expo-sqlite"

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

    // push local changes first
    await pushReviews(
      db,
      serverUrl,
      userId
    )

    // then pull remote changes
    await pullReviews(
      db,
      serverUrl,
      userId
    )

  } catch (err) {

    console.error("Review sync failed:", err)

  }

}