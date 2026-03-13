const PLACEHOLDER_SYNC_URL =
  "http://192.168.29.74:8000"

export const SYNC_SERVER_URL =
  PLACEHOLDER_SYNC_URL

export function isSyncServerConfigured() {

  return !SYNC_SERVER_URL.includes(
    "YOUR_SERVER_IP"
  )

}

export function getSyncServerUrl() {

  if (!isSyncServerConfigured()) {
    return null
  }

  return SYNC_SERVER_URL

}
