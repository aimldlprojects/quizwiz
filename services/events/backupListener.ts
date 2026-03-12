import { EventBus } from "../../engine/events/eventBus"
import { Events } from "../../engine/events/events"
import { SyncService } from "../syncService"

/*
--------------------------------------------------
Register Backup Listener
--------------------------------------------------
*/

export function registerBackupListener(
  eventBus: EventBus,
  syncService: SyncService
) {

  eventBus.on(
    Events.BACKUP_REQUESTED,
    async () => {

      try {

        await syncService.backup()

        console.log("Backup completed")

      } catch (err) {

        console.error("Backup failed:", err)

      }

    }
  )

}