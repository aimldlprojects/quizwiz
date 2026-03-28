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
): number {

  const timer = setInterval(async () => {

    try {

      await syncReviews(
        db,
        serverUrl,
        userId,
        {
          showOverlay: false
        }
      )

    } catch (err) {

      console.error("Scheduled sync failed:", err)

    }

  }, intervalMs)

  return timer as unknown as number

}

/*
--------------------------------------------------
Stop Sync Scheduler
--------------------------------------------------
*/

export function stopSyncScheduler(
  timer: number
) {

  clearInterval(timer)

}
