import { SyncService } from "../syncService"

export class SyncLifecycle {

  private syncInProgress = false
  private pendingSyncReason: string | null = null
  private lastSyncAt = 0
  private gapTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private syncService: SyncService,
    private getUserIds: () => number[] = () => [],
    private intervalMs: number = 0,
    private minGapMs: number = 0
  ) {}

  start(userId: number) {
    this.syncService.setUserId(userId)
  }

  stop() {
    if (this.gapTimer) {
      clearTimeout(this.gapTimer)
      this.gapTimer = null
    }
    this.pendingSyncReason = null
  }

  requestSync(reason: string) {
    console.log("[sync-debug] request", {
      reason,
      syncInProgress: this.syncInProgress,
      pendingReason: this.pendingSyncReason,
      lastSyncAt: this.lastSyncAt
    })
    this.pendingSyncReason = reason
    void this.runPendingSync()
  }

  isSyncing() {
    return this.syncInProgress
  }

  private scheduleRetry(delayMs: number) {
    if (this.gapTimer) {
      clearTimeout(this.gapTimer)
    }

    console.log("[sync-debug] retry scheduled", {
      delayMs,
      minGapMs: this.minGapMs
    })

    this.gapTimer = setTimeout(() => {
      this.gapTimer = null
      console.log("[sync-debug] retry firing")
      void this.runPendingSync()
    }, delayMs)
  }

  private async runPendingSync() {
    if (this.syncInProgress) return
    if (!this.pendingSyncReason) return

    const now = Date.now()
    const elapsed = this.lastSyncAt > 0
      ? now - this.lastSyncAt
      : Number.POSITIVE_INFINITY

    if (
      this.minGapMs > 0 &&
      this.lastSyncAt > 0 &&
      elapsed < this.minGapMs
    ) {
      console.log("[sync-debug] waiting for min gap", {
        elapsed,
        minGapMs: this.minGapMs
      })
      this.scheduleRetry(
        Math.max(0, this.minGapMs - elapsed)
      )
      return
    }

    this.syncInProgress = true
    let completedSync = false

    const source = this.pendingSyncReason
    this.pendingSyncReason = null
    const userIds = this.getUserIds()

    console.log("[sync-debug] sync starting", {
      source,
      userIds
    })

    try {
      if (userIds.length === 0) {
        console.log("[sync-debug] sync skipped, no users")
        return
      }

      await this.syncService.syncUsers(
        userIds,
        {
          showOverlay: source !== "timer",
          overlayLabel:
            source === "timer"
              ? "Syncing current profile..."
              : "Syncing all profiles..."
        }
      )
      completedSync = true
      console.log("[sync-debug] sync completed", {
        source,
        userIds
      })
    } catch (err) {
      console.warn(
        `Sync (${source}) failed:`,
        err
      )
    } finally {
      this.syncInProgress = false
      if (completedSync) {
        this.lastSyncAt = Date.now()
      }

      if (this.pendingSyncReason) {
        void this.runPendingSync()
      }
    }
  }

}
