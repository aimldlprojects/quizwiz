import * as SQLite from "expo-sqlite"

import {
  beginSyncActivity,
  endSyncActivity
} from "../database/syncMetaRepository"
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
    await this.syncUser(this.userId)
  }

  async syncUser(
    userId: number,
    options?: {
      showOverlay?: boolean
      overlayLabel?: string
    }
  ): Promise<void> {
    const serverUrl =
      getSyncServerUrl()

    if (!serverUrl) {
      return
    }

    const previousUserId = this.userId

    try {
      this.userId = userId
      await syncReviews(
        this.db,
        serverUrl,
        userId,
        {
          ...options,
          overlayLabel:
            options?.overlayLabel ??
            "Syncing current profile..."
        }
      )
    } catch (err) {
      console.error("Background sync failed:", err)
      throw err
    } finally {
      this.userId = previousUserId
    }

  }

  async syncUsers(
    userIds: number[],
    options?: {
      showOverlay?: boolean
      overlayLabel?: string
    }
  ): Promise<void> {
    const uniqueUserIds = Array.from(
      new Set(
        userIds.filter((userId) =>
          Number.isFinite(userId) && userId > 0
        )
      )
    )

    const serverUrl =
      getSyncServerUrl()

    if (!serverUrl) {
      return
    }

    const showOverlay =
      options?.showOverlay !== false

    if (showOverlay) {
      beginSyncActivity(
        options?.overlayLabel ?? "Syncing all profiles..."
      )
      try {
        for (const userId of uniqueUserIds) {
          try {
            await syncReviews(
              this.db,
              serverUrl,
              userId,
              {
                ...options,
                overlayLabel:
                  options?.overlayLabel ??
                  "Syncing all profiles...",
                showOverlay: false
              }
            )
          } catch (err) {
            console.warn(
              `Sync skipped for user ${userId}:`,
              err
            )
          }
        }
      } finally {
        endSyncActivity()
      }
      return
    }

      for (const userId of uniqueUserIds) {
        try {
        await syncReviews(
          this.db,
          serverUrl,
          userId,
          {
            ...options,
            overlayLabel:
              options?.overlayLabel ??
              "Syncing all profiles...",
            showOverlay: false
          }
        )
        } catch (err) {
        console.warn(
          `Sync skipped for user ${userId}:`,
          err
        )
      }
    }
  }

  setUserId(userId: number) {
    this.userId = userId
  }

}
