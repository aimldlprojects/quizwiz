import * as SQLite from "expo-sqlite"

import { getSyncMode } from "../database/settingsRepository"
import { getSyncServerUrl } from "./sync/config"
import { syncReviews } from "./sync/syncReviews"

export class SyncService {

  private db: SQLite.SQLiteDatabase
  private userId = 1

  constructor(
    db: SQLite.SQLiteDatabase,
    initialUserId: number = 1
  ) {
    this.db = db
    this.userId = initialUserId
  }

  /*
  --------------------------------------------------
  Run Full Sync
  --------------------------------------------------
  */

  async sync(): Promise<void> {

    const mode =
      await getSyncMode(this.db)

    if (mode === "local") {
      return
    }

    const serverUrl =
      getSyncServerUrl()

    if (!serverUrl) {
      return
    }

    try {
      await syncReviews(
        this.db,
        serverUrl,
        this.userId
      )
    } catch (err) {
      console.error("Background sync failed:", err)
    }

  }

  setUserId(userId: number) {
    this.userId = userId
  }

}
