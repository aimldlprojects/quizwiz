import { AppState, AppStateStatus } from "react-native"
import NetInfo, { NetInfoState } from "@react-native-community/netinfo"
import { SQLiteDatabase } from "expo-sqlite"

import { SyncService } from "../syncService"
import { getSyncMode } from "../../database/settingsRepository"
import { getSyncServerUrl } from "./config"

const DEFAULT_INTERVAL_MS = 60_000
const DEFAULT_MIN_GAP_MS = 30_000

export class SyncLifecycle {

  private timer: ReturnType<typeof setInterval> | null = null
  private syncInProgress = false
  private lastSyncAt = 0
  private networkUnsubscribe: (() => void) | null = null
  private appStateSubscription:
    | { remove: () => void }
    | null = null
  private currentAppState: AppStateStatus = "active"

  constructor(
    private db: SQLiteDatabase,
    private syncService: SyncService,
    private intervalMs: number = DEFAULT_INTERVAL_MS,
    private minGapMs: number = DEFAULT_MIN_GAP_MS
  ) {}

  start(userId: number) {
    this.syncService.setUserId(userId)
    this.clearTimer()
    this.attachNetworkListener()
    this.attachAppStateListener()
    this.schedule()
    void this.safeSync("startup")
  }

  stop() {
    this.clearTimer()
    this.detachNetworkListener()
    this.detachAppStateListener()
  }

  requestSync(reason: string) {
    void this.safeSync(reason)
  }

  private schedule() {
    this.clearTimer()
    this.timer = setInterval(() => {
      void this.safeSync("timer")
    }, this.intervalMs)
  }

  private clearTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private attachNetworkListener() {
    if (this.networkUnsubscribe) return

    this.networkUnsubscribe =
      NetInfo.addEventListener(
        (state: NetInfoState) => {

          if (
            state.isConnected === true &&
            state.isInternetReachable === true
          ) {
            void this.safeSync("network")
          }

        }
      )
  }

  private detachNetworkListener() {
    if (!this.networkUnsubscribe) return
    this.networkUnsubscribe()
    this.networkUnsubscribe = null
  }

  private attachAppStateListener() {
    if (this.appStateSubscription) return

    this.appStateSubscription =
      AppState.addEventListener(
        "change",
        (nextState: AppStateStatus) => {
          this.currentAppState = nextState
          if (nextState === "active") {
            void this.safeSync("appstate")
          }
        }
      )
  }

  private detachAppStateListener() {
    if (!this.appStateSubscription) return
    this.appStateSubscription.remove()
    this.appStateSubscription = null
  }

  private async safeSync(source: string) {
    if (this.syncInProgress) return
    this.syncInProgress = true
    let didSync = false

    try {
      if (!(await this.canPerformSync())) {
        return
      }

      await this.syncService.sync()
      didSync = true
    } catch (err) {
      console.warn(
        `Sync (${source}) failed:`,
        err
      )
    } finally {
      this.syncInProgress = false
      if (didSync) {
        this.lastSyncAt = Date.now()
      }
    }
  }

  private async canPerformSync() {
    const now = Date.now()

    if (
      now - this.lastSyncAt <
      this.minGapMs
    ) {
      return false
    }

    if (this.currentAppState !== "active") {
      return false
    }

    const mode =
      await getSyncMode(this.db)

    if (mode !== "hybrid") {
      return false
    }

    if (!getSyncServerUrl()) {
      return false
    }

    const netState = await NetInfo.fetch()

    if (
      !netState.isConnected ||
      !netState.isInternetReachable
    ) {
      return false
    }

    return true
  }

}
