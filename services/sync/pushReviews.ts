import { SQLiteDatabase } from "expo-sqlite"
import {
  getLastPushRev,
  setLastPushRev,
  beginSyncActivity,
  endSyncActivity,
  setSyncStatus,
} from "../../database/syncMetaRepository"
import {
  getActiveDeviceBackendKey
} from "../../database/deviceRegistryRepository"
import {
  getSyncMode,
  type SyncMode
} from "../../database/settingsRepository"
import { syncConfig } from "@/config/sync"

const CHUNK_SIZE = syncConfig.pushChunkSize
const DEVICE_SCOPE_SEPARATOR = "__device_"
const PROFILE_SETTING_KEYS = new Set([
  "selected_subject_id",
  "selected_topic_id",
  "selected_subject_ids",
  "selected_topic_level1_ids",
  "selected_topic_level2_ids",
  "tts_enabled",
  "auto_next_enabled",
  "auto_next_correct_delay_seconds",
  "auto_next_wrong_delay_seconds",
  "learn_auto_play_enabled",
  "learn_front_delay_seconds",
  "learn_back_delay_seconds",
  "learn_random_order_enabled",
  "practice_random_order_enabled",
  "theme_mode"
])

const DEVICE_SPECIFIC_PREFIXES = [
  "selected_subject_id_user_",
  "selected_topic_id_user_",
  "selected_subject_ids_user_",
  "selected_topic_level1_ids_user_",
  "selected_topic_level2_ids_user_",
  "learn_progress_topic_",
  "practice_session_topic_"
]
const ACTIVE_DEVICE_KEY_PREFIX = "active_device_key_user_"

function isDeviceScopedKey(key: string) {
  return key.includes(DEVICE_SCOPE_SEPARATOR)
}

function isForActiveDevice(
  key: string,
  deviceKey: string | null
) {
  if (!deviceKey) {
    return false
  }

  return key.endsWith(
    `${DEVICE_SCOPE_SEPARATOR}${deviceKey}`
  )
}

function isDeviceSpecificBaseKey(key: string) {
  return DEVICE_SPECIFIC_PREFIXES.some((prefix) =>
    key.startsWith(prefix)
  )
}

function isAbortError(error: unknown) {
  return !!error
    && typeof error === "object"
    && "name" in error
    && (error as { name?: string }).name === "AbortError"
}

function buildTimeoutError() {
  return new Error(
    `Sync timed out after ${Math.round(syncConfig.pullTimeoutMs / 1000)} seconds. Try again on a stronger connection or increase syncPullTimeoutMs.`
  )
}

/*
--------------------------------------------------
Get Local Review Changes
--------------------------------------------------
*/

async function getLocalReviewChanges(
  db: SQLiteDatabase,
  userId: number,
  lastSync: number,
  limit: number
) {

  const rows = await db.getAllAsync(
    `
    SELECT
      user_id,
      question_id,
      repetition,
      interval,
      ease_factor,
      next_review,
      last_result,
      rev_id,
      last_modified_rev,
      sync_version,
      updated_at
    FROM reviews
    WHERE user_id = ?
      AND rev_id > ?
    ORDER BY rev_id ASC
    LIMIT ?
    `,
    [userId, lastSync, limit]
  )

  return rows.map((row: any) => ({
    ...row,
    question_id: normalizeQuestionId(
      row.question_id
    )
  }))

}

function normalizeQuestionId(
  questionId: unknown
) {

  if (typeof questionId === "number") {
    return questionId
  }

  const raw = String(questionId)

  const match =
    raw.match(/^tables_(\d+)_(\d+)$/)

  if (match) {
    return Number(`${match[1]}${match[2]}`)
  }

  const numeric = Number(raw)

  return Number.isNaN(numeric) ? 0 : numeric

}

/*
--------------------------------------------------
Push Reviews To Server
--------------------------------------------------
*/

async function getStats(
  db: SQLiteDatabase,
  userId: number
) {
  return await db.getAllAsync<{
    id: number
    user_id: number
    question_id: number | null
    topic_id: number | null
    correct: number
    wrong: number
    practiced_at: number | string | null
    updated_at: number | string | null
  }>(
    `
    SELECT
      id,
      user_id,
      question_id,
      topic_id,
      correct,
      wrong,
      practiced_at,
      updated_at
    FROM stats
    WHERE user_id = ?
    `,
    [userId]
  )
}

async function getUserBadges(
  db: SQLiteDatabase,
  userId: number
) {
  return await db.getAllAsync<{
    user_id: number
    badge_id: string
    unlocked_at: number | string | null
    updated_at: number | string | null
  }>(
    `
    SELECT
      user_id,
      badge_id,
      unlockedAt AS unlocked_at,
      updated_at
    FROM user_badges
    WHERE user_id = ?
    `,
    [userId]
  )
}

async function getSettings(
  db: SQLiteDatabase,
  userId: number
) {
  return await db.getAllAsync<{
    user_id: number
    key: string
    value: string
    updated_at: number | string | null
  }>(
    `
    SELECT
      user_id,
      key,
      value,
      updated_at
    FROM settings
    WHERE user_id = ?
      OR user_id = 0
    `,
    [userId]
  )
}

async function getSettingsForSync(
  db: SQLiteDatabase,
  userId: number,
  syncMode: SyncMode,
  activeDeviceKey: string | null
) {
  const rows = await getSettings(db, userId)

  return rows.filter((row) => {
    if (row.user_id === userId) {
      const key = row.key

      if (key.startsWith(ACTIVE_DEVICE_KEY_PREFIX)) {
        return false
      }

      const scoped = isDeviceScopedKey(key)

      if (syncMode === "global_on") {
        return !scoped
      }

      if (scoped) {
        return isForActiveDevice(
          key,
          activeDeviceKey
        )
      }

      return !isDeviceSpecificBaseKey(key)
    }

    if (row.user_id !== 0) {
      if (row.user_id !== userId) {
        return false
      }

      const key = row.key
      const scoped = isDeviceScopedKey(key)

      if (syncMode === "global_on") {
        return !scoped
      }

      if (scoped) {
        return isForActiveDevice(
          key,
          activeDeviceKey
        )
      }

      return !isDeviceSpecificBaseKey(key)
    }

    return (
      row.key === "sync_mode" ||
      row.key === "sync_interval_ms" ||
      row.key === "sync_min_gap_ms" ||
      row.key.startsWith("practice_session_topic_") ||
      row.key.startsWith("admin_selected_topic_path_") ||
      row.key.startsWith("user_disabled_user_") ||
      PROFILE_SETTING_KEYS.has(row.key)
    )
  })
}

function hasMeta(
  stats: unknown[],
  settings: unknown[],
  badges: unknown[]
) {
  return (
    stats.length > 0 ||
    settings.length > 0 ||
    badges.length > 0
  )
}

export async function pushReviews(
  db: SQLiteDatabase,
  serverUrl: string,
  userId: number,
  options?: {
    showOverlay?: boolean
    overlayLabel?: string
    deviceKey?: string | null
  }
): Promise<void> {

  const resolvedDeviceKey =
    options?.deviceKey ??
    (await getActiveDeviceBackendKey(db, userId))
  const syncMode = await getSyncMode(db)

  const lastSync = await getLastPushRev(db, userId)

  const stats = await getStats(db, userId)
  const settings = await getSettingsForSync(
    db,
    userId,
    syncMode,
    resolvedDeviceKey
  )
  const badges = await getUserBadges(db, userId)

  const includeMeta = hasMeta(
    stats,
    settings,
    badges
  )

  if (!includeMeta && lastSync > 0) {
    const pending = await getLocalReviewChanges(
      db,
      userId,
      lastSync,
      1
    )

    if (pending.length === 0) {
      return
    }
  }

  let finalRev = lastSync
  let firstRequest = true
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, syncConfig.pullTimeoutMs)

  const showOverlay =
    options?.showOverlay !== false
  const overlayLabel =
    options?.overlayLabel ?? "Syncing current profile..."
  const overlayDelayMs = 150
  let overlayShown = false
  let overlayTimer: ReturnType<typeof setTimeout> | null = null

  if (showOverlay) {
    overlayTimer = setTimeout(() => {
      overlayShown = true
      beginSyncActivity(overlayLabel)
    }, overlayDelayMs)
  }

  try {
    while (true) {
      const changes = await getLocalReviewChanges(
        db,
        userId,
        finalRev,
        CHUNK_SIZE
      )

      const hasChanges = changes.length > 0

      if (!hasChanges && !firstRequest && !includeMeta) {
        break
      }

      if (!hasChanges && firstRequest && !includeMeta) {
        break
      }

      const payload: Record<string, unknown> = {
        user_id: userId,
        reviews: changes,
        client_device_key: resolvedDeviceKey ?? null
      }

      if (includeMeta && firstRequest) {
        payload.stats = stats
        payload.settings = settings
        payload.user_badges = badges
      }

      const res = await fetch(
        `${serverUrl}/reviews/push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      )

      if (!res.ok) {
        const body = await res.text()
        throw new Error(
          `Push reviews failed: ${res.status} ${body}`
        )
      }

      const data = await res.json()
      const serverMax =
        typeof data?.max_rev === "number"
          ? data.max_rev
          : finalRev

      finalRev = Math.max(finalRev, serverMax)

      if (!hasChanges) {
        break
      }

      if (changes.length < CHUNK_SIZE) {
        break
      }

      firstRequest = false
    }
  } catch (err) {
    const normalizedError = isAbortError(err)
      ? buildTimeoutError()
      : err
    await setSyncStatus(
      db,
      userId,
      "failed",
      Date.now(),
      normalizedError instanceof Error
        ? normalizedError.message
        : String(normalizedError)
    )
    throw normalizedError
  } finally {
    clearTimeout(timeoutId)
    if (overlayTimer) {
      clearTimeout(overlayTimer)
      overlayTimer = null
    }
    if (showOverlay && overlayShown) {
      endSyncActivity()
    }
  }

  await setLastPushRev(db, userId, finalRev)
  await setSyncStatus(db, userId, "success", Date.now())

}
