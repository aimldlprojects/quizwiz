import Constants from "expo-constants"

const manifest =
  Constants.manifest ??
  (Constants.expoConfig as typeof Constants.expoConfig | undefined)

const extras =
  (manifest?.extra as Record<
    string,
    string | number | boolean
  > | undefined) ?? {}

function parseNumber(
  value: unknown,
  fallback: number
): number {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return fallback
}

export const syncConfig = {
  pullTimeoutMs: parseNumber(
    extras.syncPullTimeoutMs,
    15000
  ),
  pushChunkSize: parseNumber(
    extras.syncPushChunkSize,
    128
  ),
  syncIntervalMs: parseNumber(
    extras.syncIntervalMs,
    60_000
  ),
  syncMinGapMs: parseNumber(
    extras.syncMinGapMs,
    30_000
  ),
  statsBatchSize: parseNumber(
    extras.syncStatsBatchSize,
    1024
  ),
  defaultServerUrl:
    (extras.syncServerUrl as string) ??
    "http://localhost:8000",
  enableSyncDebug:
    extras.syncDebugLogs === true ||
    extras.syncDebugLogs === "true"
}
