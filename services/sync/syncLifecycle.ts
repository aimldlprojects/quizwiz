import { SQLiteDatabase } from "expo-sqlite"

import { SyncService } from "../syncService"

export class SyncLifecycle {

  private syncInProgress = false

  constructor(
    private db: SQLiteDatabase,
    private syncService: SyncService,
    private intervalMs: number = 0,
    private minGapMs: number = 0
  ) {}

  start(userId: number) {
    this.syncService.setUserId(userId)
  }

  stop() {
    return
  }

  requestSync(reason: string) {
    void this.safeSync(reason)
  }

  private async safeSync(source: string) {
    if (this.syncInProgress) return
    this.syncInProgress = true

    try {
      await this.syncService.sync()
    } catch (err) {
      console.warn(
        `Sync (${source}) failed:`,
        err
      )
    } finally {
      this.syncInProgress = false
    }
  }

}
