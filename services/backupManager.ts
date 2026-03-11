// services/backupManager.ts

import { AppState } from "react-native"
import { SyncService } from "./syncService"

/*
-------------------------------------------------
BackupManager
-------------------------------------------------

Centralized backup system.

Handles:
✔ periodic backups
✔ background backups
✔ manual backups

-------------------------------------------------
*/

export class BackupManager {

  private syncService: SyncService

  private questionCounter = 0

  private static BACKUP_INTERVAL = 50

  private appStateSub: any

  constructor(syncService: SyncService) {

    this.syncService = syncService

    this.initAppStateListener()

  }

  // -------------------------------------------------
  // Track question answers
  // -------------------------------------------------

  async recordQuestion() {

    this.questionCounter++

    if (this.questionCounter >= BackupManager.BACKUP_INTERVAL) {

      await this.runBackup()

      this.questionCounter = 0

    }

  }

  // -------------------------------------------------
  // Manual backup
  // -------------------------------------------------

  async manualBackup() {

    await this.runBackup()

  }

  // -------------------------------------------------
  // Internal backup call
  // -------------------------------------------------

  private async runBackup() {

    try {

      await this.syncService.backup()

      console.log("Backup completed")

    } catch (err) {

      console.error("Backup failed:", err)

    }

  }

  // -------------------------------------------------
  // Background backup
  // -------------------------------------------------

  private initAppStateListener() {

    this.appStateSub = AppState.addEventListener(
      "change",
      async (state) => {

        if (state === "background") {

          await this.runBackup()

          console.log("Backup triggered (background)")

        }

      }
    )

  }

  // -------------------------------------------------
  // Cleanup
  // -------------------------------------------------

  destroy() {

    if (this.appStateSub) {
      this.appStateSub.remove()
    }

  }

}