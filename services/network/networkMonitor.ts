import NetInfo, {
    NetInfoState
} from "@react-native-community/netinfo"

import { SyncService } from "../syncService"

/*
--------------------------------------------------
Network Monitor
--------------------------------------------------
*/

export class NetworkMonitor {

  private syncService: SyncService

  private unsubscribe:
    (() => void) | null = null

  constructor(syncService: SyncService) {

    this.syncService = syncService

  }

  /*
  --------------------------------------------------
  Start Monitoring
  --------------------------------------------------
  */

  start() {

    if (this.unsubscribe) return

    this.unsubscribe =
      NetInfo.addEventListener(
        (state: NetInfoState) => {

          const online =
            state.isConnected === true &&
            state.isInternetReachable === true

          if (!online) return

          this.safeSync()

        }
      )

  }

  /*
  --------------------------------------------------
  Stop Monitoring
  --------------------------------------------------
  */

  stop() {

    if (!this.unsubscribe) return

    this.unsubscribe()

    this.unsubscribe = null

  }

  /*
  --------------------------------------------------
  Safe Sync
  --------------------------------------------------
  */

  private safeSync() {

    try {

      this.syncService.sync()

    } catch (err) {

      console.log(
        "Network sync failed:",
        err
      )

    }

  }

}