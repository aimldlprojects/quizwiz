import { SQLiteDatabase } from "expo-sqlite"
import { syncReviews } from "./syncReviews"

/*
--------------------------------------------------
Start Sync Scheduler
--------------------------------------------------
*/

export function startSyncScheduler(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number,
  intervalMs: number = 60000
) {

  const timer = setInterval(async () => {

    try {

      await syncReviews(
        db,
        serverUrl,
        userId
      )

    } catch (err) {

      console.error("Scheduled sync failed:", err)

    }

  }, intervalMs)

  return timer

}

/*
--------------------------------------------------
Stop Sync Scheduler
--------------------------------------------------
*/

export function stopSyncScheduler(
  timer: NodeJS.Timeout
) {

  clearInterval(timer)

}