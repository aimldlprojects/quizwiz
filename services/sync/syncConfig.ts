export interface SyncConfig {

  serverUrl: string

  userId: number

  enabled: boolean

  intervalMs?: number

}

/*
--------------------------------------------------
Default Sync Config
--------------------------------------------------
*/

export const defaultSyncConfig: SyncConfig = {

  serverUrl: "",

  userId: 0,

  enabled: false,

  intervalMs: 60000

}