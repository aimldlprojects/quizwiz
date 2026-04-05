import { useRouter } from "expo-router"
import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  getSyncStatus,
  type SyncStatusEntry,
  type SyncStatusRecord,
  type SyncStatusValue
} from "@/database/syncStatusRepository"
import {
  clearSyncDirty,
  getSyncDirtyAt
} from "@/database/syncMetaRepository"
import { useDatabase } from "@/hooks/useDatabase"
import { useDeviceRegistry } from "@/hooks/useDeviceRegistry"
import { useSettings } from "@/hooks/useSettings"
import { useStudyPreferences } from "@/hooks/useStudyPreferences"
import { useUsers } from "@/hooks/useUsers"
import { getSyncServerUrl } from "@/services/sync/config"
import { pullReviews } from "@/services/sync/pullReviews"
import { pushReviews } from "@/services/sync/pushReviews"
import { syncReviews } from "@/services/sync/syncReviews"
import { getThemeColors } from "@/styles/theme"
import {
  useCallback,
  useEffect,
  useState
} from "react"

function getAvatarLetter(name: string) {

  return name.trim().charAt(0).toUpperCase() || "Q"

}

const DEFAULT_SYNC_STATUS: SyncStatusEntry = {
  status: "unknown",
  message: null,
  timestamp: null
}

export default function ProfileScreen() {

  const router = useRouter()

  const { db, loading: dbLoading } =
    useDatabase()

  const {
    users,
    activeUser,
    loading: usersLoading,
    logoutCurrentUser
  } = useUsers(db, true)
  const {
    devices,
    activeDevice,
    activeDeviceKey,
    addDevice,
    deleteDevice,
    renameDevice,
    setActiveDevice,
    loading: deviceLoading
  } = useDeviceRegistry(db, activeUser)

  const {
    syncMode,
    updateSyncMode,
    syncIntervalMs,
    syncMinGapMs,
    updateSyncIntervalMs,
    updateSyncMinGapMs,
    loading: settingsLoading
  } = useSettings(db, activeUser)
  const scopedDeviceKey =
    syncMode === "global_off"
      ? activeDeviceKey
      : null

  const {
    ttsEnabled,
    setTtsEnabled,
    autoNextEnabled,
    setAutoNextEnabled,
    autoNextCorrectDelaySeconds,
    setAutoNextCorrectDelaySeconds,
    autoNextWrongDelaySeconds,
    setAutoNextWrongDelaySeconds,
    learnAutoPlayEnabled,
    setLearnAutoPlayEnabled,
    learnFrontDelaySeconds,
    setLearnFrontDelaySeconds,
    learnBackDelaySeconds,
    setLearnBackDelaySeconds,
    themeMode,
    setThemeMode,
    loading: preferencesLoading
  } = useStudyPreferences(
    db,
    activeUser,
    scopedDeviceKey
  )
  const colors = getThemeColors(themeMode)
  const themedCard = {
    backgroundColor: colors.card,
    borderColor: colors.border
  }
  const [syncing, setSyncing] =
    useState(false)

  const [syncInfo, setSyncInfo] =
    useState<SyncStatusRecord | null>(null)
  const [syncDirtyAt, setSyncDirtyAt] =
    useState<number | null>(null)
  const [remoteSyncTime, setRemoteSyncTime] =
    useState<number | null>(null)
  const [deviceNameDraft, setDeviceNameDraft] =
    useState("")
  const syncServerUrl =
    getSyncServerUrl()

  const refreshSyncStatus =
    useCallback(async () => {
      if (!db) return

      const info =
        await getSyncStatus(db)

      setSyncInfo(info)
    }, [db])

  const refreshSyncIndicators =
    useCallback(async () => {
      if (!db || !activeUser) {
        setSyncDirtyAt(null)
        setRemoteSyncTime(null)
        return
      }

      const dirtyAt =
        await getSyncDirtyAt(db, activeUser)
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

    refreshSyncStatus()
    refreshSyncIndicators()
  }, [db, refreshSyncStatus, refreshSyncIndicators, syncing])

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
  const syncPushTone =
    syncNeedsAttention && localDirty
      ? "#ef4444"
      : "#22c55e"
  const syncPullTone =
    syncNeedsAttention && remoteDirty
      ? "#ef4444"
      : "#22c55e"

  const currentUser =
    users.find(
      (user) =>
        Number(user.id) === Number(activeUser)
    )
  const currentDevice =
    activeDevice ?? null

  useEffect(() => {
    setDeviceNameDraft(
      currentDevice?.displayName ?? ""
    )
  }, [currentDevice])

  const getStatusLabel = (
    status: SyncStatusValue
  ) => {
    switch (status) {
      case "success":
        return "Healthy"
      case "failed":
        return "Failed"
      default:
        return "Unknown"
    }
  }

  if (
    dbLoading ||
    settingsLoading ||
    usersLoading ||
    preferencesLoading ||
    deviceLoading
  ) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </SafeAreaView>
    )
  }

  const globalSyncEnabled =
    syncMode === "global_on"

  async function syncToMaster() {

    if (!db || !activeUser) return

    const serverUrl =
      getSyncServerUrl()

    if (!serverUrl) {
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
        serverUrl,
        activeUser,
        {
          overlayLabel: "Syncing current profile..."
        }
      )

      Alert.alert(
        "Sync complete",
        "Your profile progress was saved to the global database and refreshed from the server."
      )
    } catch (error) {
      Alert.alert(
        "Sync failed",
        error instanceof Error
          ? error.message
          : "We could not sync your profile data right now."
      )
    } finally {
      setSyncing(false)
      await Promise.all([
        refreshSyncStatus(),
        refreshSyncIndicators()
      ])
    }
  }

  async function syncPushOnly() {

    if (!db || !activeUser) return

    const serverUrl = getSyncServerUrl()
    if (!serverUrl) {
      Alert.alert(
        "Sync unavailable",
        "Global sync is not configured yet on this device."
      )
      return
    }

    setSyncing(true)

    try {
      await pushReviews(
        db,
        serverUrl,
        activeUser,
        {
          overlayLabel: "Syncing current profile..."
        }
      )
      await clearSyncDirty(db, activeUser)
      Alert.alert(
        "Push complete",
        "Your changes were saved to the global database."
      )
    } catch (error) {
      Alert.alert(
        "Push failed",
        error instanceof Error
          ? error.message
          : "We could not push your changes right now."
      )
    } finally {
      setSyncing(false)
      await Promise.all([
        refreshSyncStatus(),
        refreshSyncIndicators()
      ])
    }
  }

  async function syncPullOnly() {

    if (!db || !activeUser) return

    const serverUrl = getSyncServerUrl()
    if (!serverUrl) {
      Alert.alert(
        "Sync unavailable",
        "Global sync is not configured yet on this device."
      )
      return
    }

    setSyncing(true)

    try {
      await pullReviews(
        db,
        serverUrl,
        activeUser,
        {
          overlayLabel: "Syncing current profile..."
        }
      )
      Alert.alert(
        "Pull complete",
        "Your device was refreshed from the global database."
      )
    } catch (error) {
      Alert.alert(
        "Pull failed",
        error instanceof Error
          ? error.message
          : "We could not pull your changes right now."
      )
    } finally {
      setSyncing(false)
      await Promise.all([
        refreshSyncStatus(),
        refreshSyncIndicators()
      ])
    }
  }

  async function handleLogout() {

    if (!db) return

    await logoutCurrentUser()
    router.replace("/users")

  }

  async function adjustDelay(
    type:
      | "correct"
      | "wrong"
      | "learn_front"
      | "learn_back",
    delta: number
  ) {

    if (type === "correct") {
      await setAutoNextCorrectDelaySeconds(
        autoNextCorrectDelaySeconds + delta
      )
      return
    }

    if (type === "learn_front") {
      await setLearnFrontDelaySeconds(
        learnFrontDelaySeconds + delta
      )
      return
    }

    if (type === "learn_back") {
      await setLearnBackDelaySeconds(
        learnBackDelaySeconds + delta
      )
      return
    }

    await setAutoNextWrongDelaySeconds(
      autoNextWrongDelaySeconds + delta
    )

  }

    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: colors.background }
        ]}
      >
      <ScrollView
        contentContainerStyle={styles.container}
        style={{ backgroundColor: colors.background }}
      >
        <View
          style={[
            styles.hero,
            { backgroundColor: colors.card }
          ]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.iconActive }
            ]}
          >
            <Text style={styles.avatarText}>
              {getAvatarLetter(
                currentUser?.name ?? "QuizWiz"
              )}
            </Text>
          </View>

          <Text
            style={[styles.heroLabel, { color: colors.muted }]}
          >
            Active Profile
          </Text>

          <Text
            style={[styles.heroName, { color: colors.text }]}
          >
            {currentUser?.name ?? "No profile selected"}
          </Text>
        </View>

          <View
            style={[styles.card, themedCard]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: colors.text }
              ]}
            >
              Change player
            </Text>

            <Text
              style={[
                styles.cardText,
                { color: colors.muted }
              ]}
            >
              Switch profiles any time without
              leaving the app.
            </Text>

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: colors.iconActive }
              ]}
              onPress={() => router.push("/users")}
            >
              <Text style={styles.primaryButtonText}>
                Change User
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.logoutButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface
                }
              ]}
              onPress={handleLogout}
            >
              <Text
                style={[
                  styles.logoutButtonText,
                  { color: colors.text }
                ]}
              >
                Log out
              </Text>
            </Pressable>
          </View>

          <View
            style={[styles.card, themedCard]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: colors.text }
              ]}
            >
              Appearance
            </Text>

            <Text
              style={[
                styles.cardText,
                { color: colors.muted }
              ]}
            >
              Choose a light or dark theme for the app.
            </Text>

            <View style={styles.syncRow}>
              <Text
                style={[
                  styles.syncLabel,
                  { color: colors.muted }
                ]}
              >
                Dark theme
              </Text>

              <Switch
                value={themeMode === "dark"}
                onValueChange={(value) =>
                  setThemeMode(
                    value ? "dark" : "light"
                  )
                }
              />
            </View>
          </View>

          <View
            style={[styles.card, themedCard]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: colors.text }
              ]}
            >
              Sync settings
            </Text>

            <View style={styles.syncRow}>
              <Text
                style={[
                  styles.syncLabel,
                  { color: colors.muted }
                ]}
              >
                Global Sync Off
              </Text>

              <Switch
                value={globalSyncEnabled}
                onValueChange={(value) =>
                  updateSyncMode(
                    value ? "global_on" : "global_off"
                  )
                }
              />

              <Text
                style={[
                  styles.syncLabel,
                  { color: colors.muted }
                ]}
              >
                Global Sync On
              </Text>
            </View>

            <View style={styles.syncActionRow}>
              <Pressable
                style={[
                  styles.syncActionChip,
                  {
                    borderColor: syncPushTone,
                    backgroundColor: colors.surface
                  }
                ]}
                onPress={syncPushOnly}
                disabled={syncing}
              >
                <MaterialIcons
                  name="north"
                  size={20}
                  color={syncPushTone}
                />
              </Pressable>

              <Pressable
                style={[
                  styles.syncGlyphButton,
                  {
                    borderColor: syncTone,
                    backgroundColor: colors.surface
                  }
                ]}
                onPress={syncToMaster}
                disabled={syncing}
              >
                <View
                  style={[
                    styles.syncGlyphIcon,
                    {
                      borderColor: syncTone,
                      backgroundColor:
                        syncNeedsAttention
                          ? "rgba(245, 158, 11, 0.12)"
                          : "rgba(34, 197, 94, 0.10)"
                    }
                  ]}
                >
                {syncing ? (
                  <ActivityIndicator color={syncTone} />
                ) : (
                  <MaterialIcons
                    name="sync"
                    size={24}
                    color={syncTone}
                  />
                )}
              </View>
              <View style={styles.syncGlyphCopy}>
                <Text
                  style={[
                    styles.syncGlyphLabel,
                    { color: colors.text }
                  ]}
                >
                  {syncNeedsAttention
                    ? "Sync"
                    : "Synced"}
                </Text>
                <Text
                  style={[
                    styles.syncGlyphSubtext,
                    { color: syncTone }
                  ]}
                >
                  {syncNeedsAttention
                    ? "!"
                    : overallStatus.status === "failed"
                    ? "x"
                    : "✓"}
                </Text>
              </View>
              </Pressable>

              <Pressable
                style={[
                  styles.syncActionChip,
                  {
                    borderColor: syncPullTone,
                    backgroundColor: colors.surface
                  }
                ]}
                onPress={syncPullOnly}
                disabled={syncing}
              >
                <MaterialIcons
                  name="south"
                  size={20}
                  color={syncPullTone}
                />
              </Pressable>
            </View>

            <View
              style={[
                styles.syncStatusMeta,
                {
                  borderColor: syncTone
                }
              ]}
            >
              <Text
                style={[
                  styles.syncStatusMetaLabel,
                  { color: colors.muted }
                ]}
              >
                Sync status
              </Text>
              <Text
                style={[
                  styles.syncStatusMetaText,
                  { color: colors.text }
                ]}
              >
                {syncNeedsAttention
                  ? "Updates available"
                  : getStatusLabel(overallStatus.status)}
              </Text>
              <Text
                style={[
                  styles.syncStatusMetaTimestamp,
                  { color: colors.muted }
                ]}
              >
                Last update:{" "}
                {formatSyncTimestamp(
                  overallStatus.timestamp
                )}
              </Text>
              {syncNeedsAttention ? (
                <Text
                  style={[
                    styles.syncStatusMetaMessage,
                    { color: colors.muted }
                  ]}
                >
                  Another device or pending change is waiting to sync.
                </Text>
              ) : overallStatus.message ? (
                <Text
                  style={[
                    styles.syncStatusMetaMessage,
                    { color: colors.muted }
                  ]}
                >
                  {overallStatus.message}
                </Text>
              ) : null}
            </View>

            <View style={styles.syncStatusRow}>
              <Text
                style={[
                  styles.syncLabel,
                  { color: colors.muted }
                ]}
              >
                Server
              </Text>

              <Text
                style={[
                  styles.syncValue,
                  { color: colors.text }
                ]}
              >
                {syncServerUrl ?? "Not configured"}
              </Text>
            </View>

            <View style={styles.syncStatusRow}>
              <Text
                style={[
                  styles.syncLabel,
                  { color: colors.muted }
                ]}
              >
                Connection
              </Text>

              <Text
                style={[
                  styles.syncValue,
                  {
                    color:
                      overallStatus.status === "failed"
                        ? "#f87171"
                        : syncNeedsAttention
                        ? "#f59e0b"
                        : colors.iconActive
                  }
                ]}
              >
                {syncServerUrl
                  ? overallStatus.status === "failed"
                    ? "Unstable"
                    : syncNeedsAttention
                    ? "Waiting"
                    : "Healthy"
                  : "Unavailable"}
              </Text>
            </View>

            <Text
              style={[
                styles.syncTimestamp,
              { color: colors.muted }
            ]}
          >
            Last sync:{" "}
            {formatSyncTimestamp(
              overallStatus.timestamp
            )}
          </Text>
        </View>

        <View
          style={[styles.card, themedCard]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text }
            ]}
          >
            Linked device
          </Text>

          <Text
            style={[
              styles.cardText,
              { color: colors.muted }
            ]}
          >
            This is the device currently linked to this profile. Rename it here or open Admin to manage all devices.
          </Text>

          {currentDevice ? (
            <>
              <Text
                style={[
                  styles.syncLabel,
                  { color: colors.muted, marginTop: 12 }
                ]}
              >
                Active device
              </Text>
              <Text
                style={[
                  styles.metaValue,
                  { color: colors.text, marginTop: 6 }
                ]}
              >
                {currentDevice.displayName}
              </Text>

              <TextInput
                value={deviceNameDraft}
                onChangeText={setDeviceNameDraft}
                placeholder="Edit device display name"
                placeholderTextColor={colors.muted}
                style={[
                  styles.nameInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                    marginTop: 12
                  }
                ]}
              />

              <View style={styles.deviceActionRow}>
                <Pressable
                  style={[
                    styles.primaryButton,
                    {
                      flex: 1,
                      backgroundColor: colors.iconActive
                    }
                  ]}
                  onPress={async () => {
                    try {
                      await renameDevice(
                        currentDevice.backendKey,
                        deviceNameDraft
                      )
                    } catch (error) {
                      Alert.alert(
                        "Could not rename device",
                        error instanceof Error
                          ? error.message
                          : "Please choose a different name."
                      )
                    }
                  }}
                >
                  <Text style={styles.primaryButtonText}>
                    Save Name
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.logoutButton,
                    {
                      flex: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surface
                    }
                  ]}
                  onPress={() =>
                    router.push("/admin")
                  }
                  >
                  <Text
                    style={[
                      styles.logoutButtonText,
                      { color: colors.text }
                    ]}
                  >
                    Open Admin
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.cardText,
                  { color: colors.muted, marginTop: 12 }
                ]}
              >
                No device is linked yet. Open Admin to register one.
              </Text>
              <Pressable
                style={[
                  styles.secondaryButton,
                  { backgroundColor: colors.iconActive }
                ]}
                onPress={() => router.push("/admin")}
              >
                <Text style={styles.secondaryButtonText}>
                  Go to Admin
                </Text>
              </Pressable>
            </>
          )}
        </View>

          <View
            style={[styles.card, themedCard]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: colors.text }
              ]}
            >
              Scheduler sync
            </Text>
            <Text
              style={[
                styles.cardText,
                { color: colors.muted }
              ]}
            >
              Set how often the scheduler sync runs.
            </Text>
            <View style={styles.tunerRow}>
              <View style={styles.tunerColumn}>
                <Text
                  style={[
                    styles.metaLabel,
                    { color: colors.muted }
                  ]}
                >
                  Sync interval
                </Text>
                <Text
                  style={[
                    styles.metaValue,
                    { color: colors.text }
                  ]}
                >
                  {(syncIntervalMs / 1000).toFixed(0)}s
                </Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepButton}
                    onPress={() =>
                      updateSyncIntervalMs(
                        syncIntervalMs - 15_000
                      )
                    }
                  >
                    <Text style={styles.stepButtonText}>
                      -
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.stepButton}
                    onPress={() =>
                      updateSyncIntervalMs(
                        syncIntervalMs + 15_000
                      )
                    }
                  >
                    <Text style={styles.stepButtonText}>
                      +
                    </Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.tunerColumn}>
                <Text
                  style={[
                    styles.metaLabel,
                    { color: colors.muted }
                  ]}
                >
                  Sync gap
                </Text>
                <Text
                  style={[
                    styles.metaValue,
                    { color: colors.text }
                  ]}
                >
                  {(syncMinGapMs / 1000).toFixed(0)}s
                </Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepButton}
                    onPress={() =>
                      updateSyncMinGapMs(
                        syncMinGapMs - 5_000
                      )
                    }
                  >
                    <Text style={styles.stepButtonText}>
                      -
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.stepButton}
                    onPress={() =>
                      updateSyncMinGapMs(
                        syncMinGapMs + 5_000
                      )
                    }
                  >
                    <Text style={styles.stepButtonText}>
                      +
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

        <View
          style={[styles.card, themedCard]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text }
            ]}
          >
            Voice settings
          </Text>

          <View style={styles.syncRow}>
            <Text
              style={[
                styles.syncLabel,
                { color: colors.muted }
              ]}
            >
              Read questions aloud
            </Text>

            <Switch
              value={ttsEnabled}
              onValueChange={setTtsEnabled}
            />
          </View>
        </View>

        <View
          style={[styles.card, themedCard]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text }
            ]}
          >
            Practice navigation
          </Text>

          <Text
            style={[
              styles.cardText,
              { color: colors.muted }
            ]}
          >
            Move to the next question automatically after each answer.
          </Text>

          <View style={styles.syncRow}>
            <Text
              style={[
                styles.syncLabel,
                { color: colors.muted }
              ]}
            >
              Auto next
            </Text>

            <Switch
              value={autoNextEnabled}
              onValueChange={setAutoNextEnabled}
            />
          </View>

          <View style={styles.delayRow}>
            <Text
              style={[
                styles.delayLabel,
                { color: colors.text }
              ]}
            >
              Correct answer delay
            </Text>

            <View style={styles.stepper}>
              <Pressable
                style={styles.stepButton}
                onPress={() =>
                  adjustDelay("correct", -1)
                }
              >
                <Text style={styles.stepButtonText}>
                  -
                </Text>
              </Pressable>

              <Text
                style={[
                  styles.delayValue,
                  { color: colors.text }
                ]}
              >
                {autoNextCorrectDelaySeconds}s
              </Text>

              <Pressable
                style={styles.stepButton}
                onPress={() =>
                  adjustDelay("correct", 1)
                }
              >
                <Text style={styles.stepButtonText}>
                  +
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.delayRow}>
            <Text
              style={[
                styles.delayLabel,
                { color: colors.text }
              ]}
            >
              Wrong answer delay
            </Text>

            <View style={styles.stepper}>
              <Pressable
                style={styles.stepButton}
                onPress={() =>
                  adjustDelay("wrong", -1)
                }
              >
                <Text style={styles.stepButtonText}>
                  -
                </Text>
              </Pressable>

              <Text
                style={[
                  styles.delayValue,
                  { color: colors.text }
                ]}
              >
                {autoNextWrongDelaySeconds}s
              </Text>

              <Pressable
                style={styles.stepButton}
                onPress={() =>
                  adjustDelay("wrong", 1)
                }
              >
                <Text style={styles.stepButtonText}>
                  +
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View
          style={[styles.card, themedCard]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text }
            ]}
          >
            Learn navigation
          </Text>

          <Text
            style={[
              styles.cardText,
              { color: colors.muted }
            ]}
          >
            Auto flip flash cards and move to the next card after the answer side is shown.
          </Text>

          <View style={styles.syncRow}>
            <Text
              style={[
                styles.syncLabel,
                { color: colors.muted }
              ]}
            >
              Auto play learn cards
            </Text>

            <Switch
              value={learnAutoPlayEnabled}
              onValueChange={setLearnAutoPlayEnabled}
            />
          </View>

          <View style={styles.delayRow}>
            <Text
              style={[
                styles.delayLabel,
                { color: colors.text }
              ]}
            >
              Front side delay
            </Text>

            <View style={styles.stepper}>
              <Pressable
                style={styles.stepButton}
                onPress={() =>
                  adjustDelay(
                    "learn_front",
                    -1
                  )
                }
              >
                <Text style={styles.stepButtonText}>
                  -
                </Text>
              </Pressable>

              <Text
                style={[
                  styles.delayValue,
                  { color: colors.text }
                ]}
              >
                {learnFrontDelaySeconds}s
              </Text>

              <Pressable
                style={styles.stepButton}
                onPress={() =>
                  adjustDelay(
                    "learn_front",
                    1
                  )
                }
              >
                <Text style={styles.stepButtonText}>
                  +
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.delayRow}>
            <Text
              style={[
                styles.delayLabel,
                { color: colors.text }
              ]}
            >
              Back side delay
            </Text>

            <View style={styles.stepper}>
              <Pressable
                style={styles.stepButton}
                onPress={() =>
                  adjustDelay(
                    "learn_back",
                    -1
                  )
                }
              >
                <Text style={styles.stepButtonText}>
                  -
                </Text>
              </Pressable>

              <Text
                style={[
                  styles.delayValue,
                  { color: colors.text }
                ]}
              >
                {learnBackDelaySeconds}s
              </Text>

              <Pressable
                style={styles.stepButton}
                onPress={() =>
                  adjustDelay(
                    "learn_back",
                    1
                  )
                }
              >
                <Text style={styles.stepButtonText}>
                  +
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

          <View
            style={[styles.card, themedCard]}
          >
            <Text
            style={[
              styles.cardTitle,
              { color: colors.text }
            ]}
          >
            Admin tools
          </Text>

          <Text
            style={[
              styles.cardText,
              { color: colors.muted }
            ]}
          >
            Add or remove learner profiles with
            the admin password.
          </Text>

          <Pressable
            style={[
              styles.adminButton,
              { backgroundColor: colors.iconActive }
            ]}
            onPress={() => router.push("/admin")}
          >
            <Text style={styles.adminButtonText}>
              Open Admin
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )

}

function formatSyncTimestamp(
  timestamp: number | null | undefined
): string {

  if (!timestamp) {
    return "Never"
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(new Date(timestamp))

}

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: "#f8fbff"
  },

  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 120
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fbff"
  },

  loadingText: {
    fontSize: 18,
    color: "#1e3a5f"
  },

  hero: {
    backgroundColor: "#dbeafe",
    borderRadius: 28,
    padding: 24,
    alignItems: "center"
  },

  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center"
  },

  avatarText: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "800"
  },

  heroLabel: {
    marginTop: 14,
    color: "#475569",
    fontWeight: "700",
    textTransform: "uppercase"
  },

  heroName: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: "#1e3a5f",
    textAlign: "center"
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e3a5f"
  },

  cardText: {
    fontSize: 15,
    color: "#475569",
    marginTop: 8,
    lineHeight: 22
  },

  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14
  },

  syncStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },

  syncActionRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10
  },

  syncActionChip: {
    width: 52,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },

  syncActionLabel: {
    fontSize: 12,
    fontWeight: "800"
  },

  syncGlyphButton: {
    flex: 1.4,
    borderWidth: 2,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },

  syncGlyphIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },

  syncGlyphCopy: {
    flex: 1
  },

  syncGlyphLabel: {
    fontSize: 14,
    fontWeight: "800"
  },

  syncGlyphSubtext: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 12
  },

  syncStatusMeta: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10
  },

  syncStatusMetaLabel: {
    fontSize: 13,
    fontWeight: "600"
  },

  syncStatusMetaText: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4
  },

  syncStatusMetaTimestamp: {
    fontSize: 12,
    marginTop: 4
  },

  syncStatusMetaMessage: {
    fontSize: 12,
    marginTop: 2
  },

  syncLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a5f"
  },

  syncValue: {
    fontSize: 14,
    fontWeight: "700"
  },

  syncTimestamp: {
    marginTop: 6,
    fontSize: 12
  },

  nameInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: 12
  },

  deviceChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },

  deviceChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },

  deviceChipText: {
    fontWeight: "700"
  },

  deviceActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },

  tunerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12
  },

  tunerColumn: {
    flex: 1
  },

  metaLabel: {
    fontSize: 13,
    fontWeight: "700"
  },

  metaValue: {
    fontSize: 15,
    fontWeight: "800"
  },

  syncMessage: {
    fontSize: 12,
    marginTop: 2
  },

  delayRow: {
    marginTop: 16,
    gap: 10
  },

  delayLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e3a5f"
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  stepButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center"
  },

  stepButtonText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1d4ed8"
  },

  delayValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#1e3a5f"
  },

  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },

  logoutButton: {
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12
  },

  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700"
  },

  secondaryButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16
  },

  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800"
  },

  outlineButton: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 14,
    alignItems: "center"
  },

  outlineButtonText: {
    fontSize: 12,
    fontWeight: "800"
  },

  adminButton: {
    backgroundColor: "#f97316",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16
  },

  adminButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  }

})
