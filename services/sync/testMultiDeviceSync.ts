import { SQLiteDatabase } from "expo-sqlite"

import { pullReviews } from "./pullReviews"
import { pushReviews } from "./pushReviews"

/*
--------------------------------------------------
Test Multi Device Sync
--------------------------------------------------
*/

export async function testMultiDeviceSync(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number
) {
  // push local changes
  await pushReviews(
    db,
    serverUrl,
    userId
  )

  // pull remote changes
  await pullReviews(
    db,
    serverUrl,
    userId
  )

}
