// hooks/useBackupManager.ts

import { BackupManager } from "../services/backupManager"
import { SyncService } from "../services/syncService"
import { useController } from "./useController"

export function useBackupManager(db: any) {

  const syncService = useController(() => {

    if (!db) return null

    return new SyncService(db)

  })

  const backupManager = useController(() => {

    if (!syncService) return null

    return new BackupManager(syncService)

  })

  return backupManager

}