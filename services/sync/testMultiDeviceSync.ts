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

  console.log("Starting multi-device sync test")

  // push local changes
  await pushReviews(
    db,
    serverUrl,
    userId
  )

  console.log("Push completed")

  // pull remote changes
  await pullReviews(
    db,
    serverUrl,
    userId
  )

  console.log("Pull completed")

  console.log("Multi-device sync test finished")

}