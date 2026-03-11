// hooks/useAutoBackup.ts

import { useEffect } from "react"
import { AppState } from "react-native"
import { SyncService } from "../services/syncService"

/*
-------------------------------------------------
Automatic Backup Hook
-------------------------------------------------

Triggers backup when app goes to background.

Example triggers:
- user presses home button
- app minimized
- switching apps

-------------------------------------------------
*/

export function useAutoBackup(syncService: SyncService) {

  useEffect(() => {

    const subscription = AppState.addEventListener(
      "change",
      async (state) => {

        if (state === "background") {

          await syncService.backup()

          console.log("Auto backup triggered (background)")

        }

      }
    )

    return () => {
      subscription.remove()
    }

  }, [syncService])

}