import Constants from "expo-constants"

const manifest =
  Constants.manifest ??
  (Constants.expoConfig as typeof Constants.expoConfig | undefined)

const extras =
  (manifest?.extra as Record<string, unknown> | undefined) ?? {}

const syncDebugEnabled =
  extras.syncDebugLogs === true ||
  extras.syncDebugLogs === "true"

const syncConsoleLogsEnabled =
  extras.syncConsoleLogs === false ? false : true

type LogLevel = "error" | "warning" | "info" | "debug"

const DEFAULT_LEVEL: LogLevel = "info"

const levelOrder: Record<LogLevel, number> = {
  error: 0,
  warning: 1,
  info: 2,
  debug: 3
}

function parseLogLevel(value: unknown): LogLevel {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized in levelOrder) {
      return normalized as LogLevel
    }
  }

  return DEFAULT_LEVEL
}

const configuredLogLevel =
  parseLogLevel(extras.syncLogLevel)

function canLog(level: LogLevel) {
  return (
    levelOrder[level] <= levelOrder[configuredLogLevel]
  )
}

export function isSyncDebugLoggingEnabled() {
  return syncDebugEnabled
}

export function isSyncConsoleLoggingEnabled() {
  return syncConsoleLogsEnabled
}

export function logSyncConsole(
  message: string,
  ...args: unknown[]
) {
  if (!syncConsoleLogsEnabled) {
    return
  }

  if (!canLog("info")) {
    return
  }

  console.log(`[sync-console] ${message}`, ...args)
}

export function logSyncDebug(
  message: string,
  ...args: unknown[]
) {
  if (!syncDebugEnabled) {
    return
  }

  if (!canLog("debug")) {
    return
  }

  console.log(`[sync-debug] ${message}`, ...args)
}

export function logSyncWarning(
  message: string,
  ...args: unknown[]
) {
  if (!canLog("warning")) {
    return
  }

  console.warn(`[sync-warning] ${message}`, ...args)
}

export function logSyncError(
  message: string,
  ...args: unknown[]
) {
  if (!canLog("error")) {
    return
  }

  console.error(`[sync-error] ${message}`, ...args)
}
