import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native"
import { SQLiteDatabase } from "expo-sqlite"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import {
  clearSyncDirty,
  getSyncDirtyAt,
  subscribeSyncMetaChanges
} from "@/database/syncMetaRepository"
import {
  getSyncStatus,
  type SyncStatusRecord,
  type SyncStatusValue
} from "@/database/syncStatusRepository"
import { getSyncServerUrl } from "@/services/sync/config"
import { syncReviews } from "@/services/sync/syncReviews"
import type { ThemeColors } from "@/styles/theme"

const DEFAULT_SYNC_STATUS = {
  status: "unknown" as SyncStatusValue,
  message: null,
  timestamp: null
}

interface Props {
  db: SQLiteDatabase | null
  activeUser: number | null
  syncMode: string
  syncIntervalMs: number
  colors: ThemeColors
  variant?: "floating" | "inline"
}

export default function GlobalSyncButton({
  db,
  activeUser,
  syncMode,
  syncIntervalMs,
  colors,
  variant = "floating"
}: Props) {

  const insets = useSafeAreaInsets()
  const [syncing, setSyncing] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [syncInfo, setSyncInfo] =
    useState<SyncStatusRecord | null>(null)
  const [syncDirtyAt, setSyncDirtyAt] =
    useState<number | null>(null)
  const [remoteSyncTime, setRemoteSyncTime] =
    useState<number | null>(null)
  const syncServerUrl = getSyncServerUrl()

  const refreshSyncStatus = useCallback(
    async () => {
      if (!db) return
      const info = await getSyncStatus(db)
      setSyncInfo(info)
    },
    [db]
  )

  const refreshSyncIndicators =
    useCallback(async () => {
      if (!db || !activeUser) {
        setSyncDirtyAt(null)
        setRemoteSyncTime(null)
        return
      }

      const dirtyAt = await getSyncDirtyAt(
        db,
        activeUser
      )
      setSyncDirtyAt(dirtyAt || null)

      if (!syncServerUrl) {
        setRemoteSyncTime(null)
        return
      }

      try {
        const response = await fetch(
          `${syncServerUrl}/reviews/status?user_id=${activeUser}`
        )

        if (!response.ok) {
          setRemoteSyncTime(null)
          return
        }

        const json = await response.json()
        setRemoteSyncTime(
          typeof json?.last_sync_time === "number"
            ? json.last_sync_time
            : null
        )
      } catch {
        setRemoteSyncTime(null)
      }
    }, [db, activeUser, syncServerUrl])

  useEffect(() => {
    if (!db) return
    if (syncing) return

    void refreshSyncStatus()
    void refreshSyncIndicators()
  }, [
    db,
    refreshSyncIndicators,
    refreshSyncStatus,
    syncing,
    activeUser
  ])

  useEffect(() => {
    if (!db) return

    return subscribeSyncMetaChanges(() => {
      void refreshSyncIndicators()
    })
  }, [db, refreshSyncIndicators])

  const overallStatus =
    syncInfo?.overall ?? DEFAULT_SYNC_STATUS
  const latestLocalSyncAt =
    overallStatus.timestamp ?? 0
  const localDirty =
    syncDirtyAt != null &&
    syncDirtyAt > latestLocalSyncAt
  const remoteDirty =
    remoteSyncTime != null &&
    remoteSyncTime > latestLocalSyncAt
  const syncNeedsAttention =
    localDirty || remoteDirty
  const syncTone =
    overallStatus.status === "failed"
      ? "#ef4444"
      : syncNeedsAttention
      ? "#f59e0b"
      : overallStatus.status === "success"
      ? "#22c55e"
      : colors.border
  const syncBackground =
    overallStatus.status === "failed"
      ? "rgba(239, 68, 68, 0.14)"
      : syncNeedsAttention
      ? "rgba(245, 158, 11, 0.14)"
      : colors.surface
  const badgeColor =
    overallStatus.status === "failed" || localDirty
      ? "#ef4444"
      : remoteDirty
      ? "#f59e0b"
      : null
  const badgeStyle = useMemo(
    () => [
      styles.badge,
      badgeColor == null
        ? null
        : {
            backgroundColor: badgeColor,
            opacity: syncing ? 0.7 : 1,
            transform: syncing
              ? [{ scale: 1.05 }]
              : [{ scale: 1 }]
          }
    ],
    [badgeColor, syncing]
  )
  const nextAutoSyncText = useMemo(() => {
    if (syncMode !== "hybrid") {
      return "Auto sync off"
    }

    if (syncIntervalMs <= 0) {
      return "Auto sync off"
    }

    const baseTimestamp =
      overallStatus.timestamp ?? now
    const nextSyncAt = baseTimestamp + syncIntervalMs
    const remaining = Math.max(
      0,
      nextSyncAt - now
    )

    if (remaining <= 1000) {
      return "Auto sync due now"
    }

    const totalSeconds = Math.ceil(remaining / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    if (minutes > 0) {
      return seconds > 0
        ? `Auto sync in ${minutes}m ${seconds}s`
        : `Auto sync in ${minutes}m`
    }

    return `Auto sync in ${seconds}s`
  }, [now, overallStatus.timestamp, syncIntervalMs, syncMode])
  const nextAutoSyncCompactText =
    useMemo(() => {
      if (syncMode !== "hybrid") {
        return "Off"
      }

      if (syncIntervalMs <= 0) {
        return "Off"
      }

      const baseTimestamp =
        overallStatus.timestamp ?? now
      const nextSyncAt = baseTimestamp + syncIntervalMs
      const remaining = Math.max(
        0,
        nextSyncAt - now
      )

      if (remaining <= 1000) {
        return "Now"
      }

      const totalSeconds = Math.ceil(remaining / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60

      if (minutes > 0) {
        return seconds > 0
          ? `${minutes}m ${seconds}s`
          : `${minutes}m`
      }

      return `${seconds}s`
    }, [now, overallStatus.timestamp, syncIntervalMs, syncMode])
  const shouldUseCompactCaption =
    variant === "inline"
  const inlineIconSize =
    shouldUseCompactCaption ? 18 : 20
  const captionText =
    shouldUseCompactCaption
      ? nextAutoSyncCompactText
      : nextAutoSyncText

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  async function syncToMaster() {
    if (!db || !activeUser) return

    if (!syncServerUrl) {
      Alert.alert(
        "Sync unavailable",
        "Global sync is not configured yet on this device."
      )
      return
    }

    setSyncing(true)

    try {
      await syncReviews(
        db,
        syncServerUrl,
        activeUser,
        {
          overlayLabel: "Syncing current profile..."
        }
      )
      await clearSyncDirty(db, activeUser)
      await refreshSyncStatus()
      await refreshSyncIndicators()
    } catch (error) {
      Alert.alert(
        "Sync failed",
        error instanceof Error
          ? error.message
          : "Unable to sync right now."
      )
    } finally {
      setSyncing(false)
    }
  }

  if (!db || !activeUser) {
    return null
  }

  if (variant === "inline") {
    return (
      <View style={styles.inlineContainer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sync changes"
          style={[
            styles.inlineButton,
            {
              borderColor: syncTone,
              backgroundColor: syncBackground
            }
          ]}
          onPress={syncToMaster}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator
              size="small"
              color={syncTone}
            />
          ) : (
            <MaterialIcons
              name="sync"
              size={inlineIconSize}
              color={syncTone}
            />
          )}
        </Pressable>

        <View style={styles.inlineCaptionWrap}>
          <View
            style={[
              styles.inlineCaptionPill,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border
              }
            ]}
          >
            <MaterialIcons
              name={
                syncMode === "hybrid"
                  ? "schedule"
                  : "sync-disabled"
              }
              size={10}
              color={syncTone}
            />
            <Text
              style={[
                styles.inlineCaptionText,
                { color: colors.text }
              ]}
              numberOfLines={1}
            >
              {captionText}
            </Text>
          </View>
        </View>

        {badgeColor ? (
          <View
            pointerEvents="none"
            style={[
              styles.badge,
              {
                backgroundColor: badgeColor,
                opacity: syncing ? 0.7 : 1,
                transform: syncing
                  ? [{ scale: 1.05 }]
                  : [{ scale: 1 }]
              }
            ]}
          />
        ) : null}
      </View>
    )
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          top: insets.top + 10,
          right: 12
        }
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sync changes"
        style={[
          styles.button,
          {
            borderColor: syncTone,
            backgroundColor: syncBackground
          }
        ]}
        onPress={syncToMaster}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator
            size="small"
            color={syncTone}
          />
        ) : (
          <MaterialIcons
            name="sync"
            size={22}
            color={syncTone}
          />
        )}
      </Pressable>

      <View style={styles.captionWrap}>
        <View
          style={[
            styles.captionPill,
            {
              backgroundColor:
                syncNeedsAttention
                  ? "rgba(245, 158, 11, 0.12)"
                  : "rgba(255,255,255,0.9)",
              borderColor: syncTone
            }
          ]}
        >
          <MaterialIcons
            name={
              syncMode === "hybrid"
                ? "schedule"
                : "sync-disabled"
            }
            size={11}
            color={syncTone}
          />
          <Text
            style={[
              styles.captionText,
              { color: syncTone }
            ]}
          >
            {captionText}
          </Text>
        </View>
      </View>

      {badgeColor ? (
        <View
          pointerEvents="none"
          style={badgeStyle}
        />
      ) : null}
    </View>
  )

}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 50,
    elevation: 10
  },

  inlineContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexDirection: "row"
  },

  inlineCaptionWrap: {
    width: 44,
    alignItems: "center"
  },

  inlineCaptionPill: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 3,
    gap: 2
  },

  captionWrap: {
    position: "absolute",
    top: 48,
    right: 0,
    alignItems: "flex-end"
  },

  captionPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },

  captionText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: "700"
  },

  inlineCaptionText: {
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
    opacity: 0.8,
    width: "100%"
  },

  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },

  inlineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },

  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ffffff"
  }
})
