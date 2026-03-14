import { useRouter } from "expo-router"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  getSyncStatus,
  setSyncStatus,
  type SyncStatusEntry,
  type SyncStatusRecord,
  type SyncStatusValue
} from "@/database/syncStatusRepository"
import { useDatabase } from "@/hooks/useDatabase"
import { useSettings } from "@/hooks/useSettings"
import { useStudyPreferences } from "@/hooks/useStudyPreferences"
import { useUsers } from "@/hooks/useUsers"
import { getSyncServerUrl } from "@/services/sync/config"
import { pullReviews } from "@/services/sync/pullReviews"
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
    syncMode,
    updateSyncMode,
    loading: settingsLoading
  } = useSettings(db)

  const {
    users,
    activeUser,
    loading: usersLoading
  } = useUsers(db, true)
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
    activeUser
  )
  const colors = getThemeColors(themeMode)
  const themedCard = {
    backgroundColor: colors.card,
    borderColor: colors.border
  }
  const [syncing, setSyncing] =
    useState(false)
  const [pulling, setPulling] =
    useState(false)

  const [syncInfo, setSyncInfo] =
    useState<SyncStatusRecord | null>(null)
  const syncServerUrl =
    getSyncServerUrl()

  const refreshSyncStatus =
    useCallback(async () => {
      if (!db) return

      const info =
        await getSyncStatus(db)

      setSyncInfo(info)
    }, [db])

  useEffect(() => {
    if (!db) return
    if (syncing || pulling) return

    refreshSyncStatus()
  }, [db, refreshSyncStatus, syncing, pulling])

  const overallStatus =
    syncInfo?.overall ?? DEFAULT_SYNC_STATUS
  const pushStatus =
    syncInfo?.push ?? DEFAULT_SYNC_STATUS
  const pullStatus =
    syncInfo?.pull ?? DEFAULT_SYNC_STATUS

  const getStatusColor = (
    status: SyncStatusValue
  ) => {
    switch (status) {
      case "success":
        return "#22c55e"
      case "failed":
        return "#ef4444"
      default:
        return colors.border
    }
  }

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
    preferencesLoading
  ) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </SafeAreaView>
    )
  }

  const currentUser =
    users.find(
      (user) =>
        Number(user.id) === Number(activeUser)
    )

  const hybridEnabled =
    syncMode === "hybrid"

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
        activeUser
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
      await refreshSyncStatus()
    }
  }

  async function syncFromMaster() {

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

    setPulling(true)

    try {
      await pullReviews(
        db,
        serverUrl,
        activeUser
      )

      await setSyncStatus(
        db,
        "success",
        "Pulled your profile data from the master database.",
        Date.now(),
        "pull"
      )

      await setSyncStatus(
        db,
        "success",
        "Last sync completed successfully."
      )

      Alert.alert(
        "Sync complete",
        "Your profile was refreshed from the master database."
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We could not pull your profile data right now."

      await setSyncStatus(
        db,
        "failed",
        message,
        Date.now(),
        "pull"
      )

      await setSyncStatus(
        db,
        "failed",
        message
      )

      Alert.alert("Sync failed", message)
    } finally {
      setPulling(false)
      await refreshSyncStatus()
    }

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
                Local
              </Text>

              <Switch
                value={hybridEnabled}
                onValueChange={(value) =>
                  updateSyncMode(
                    value ? "hybrid" : "local"
                  )
                }
              />

              <Text
                style={[
                  styles.syncLabel,
                  { color: colors.muted }
                ]}
              >
                Hybrid
              </Text>
            </View>

            <View style={styles.syncButtonsGrid}>
              <View
                style={[
                  styles.syncActionColumn,
                  { marginRight: 8 }
                ]}
              >
                <Pressable
                  style={[
                    styles.secondaryButton,
                    styles.syncActionButton,
                    {
                      borderColor: getStatusColor(
                        pushStatus.status
                      ),
                      backgroundColor: colors.surface
                    }
                  ]}
                  onPress={syncToMaster}
                  disabled={syncing}
                >
                  {syncing ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      {
                        color: getStatusColor(
                          pushStatus.status
                        )
                      }
                    ]}
                  >
                    Sync To Master DB
                  </Text>
                  )}
                </Pressable>

                <View
                  style={[
                    styles.syncStatusMeta,
                    {
                      borderColor: getStatusColor(
                        pushStatus.status
                      )
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.syncStatusMetaLabel,
                      { color: colors.muted }
                    ]}
                  >
                    Sync To Master status
                  </Text>
                  <Text
                    style={[
                      styles.syncStatusMetaText,
                      { color: colors.text }
                    ]}
                  >
                    {getStatusLabel(pushStatus.status)}
                  </Text>
                  <Text
                    style={[
                      styles.syncStatusMetaTimestamp,
                      { color: colors.muted }
                    ]}
                  >
                    Last update:{" "}
                    {formatSyncTimestamp(
                      pushStatus.timestamp
                    )}
                  </Text>
                  {pushStatus.message ? (
                    <Text
                      style={[
                        styles.syncStatusMetaMessage,
                        { color: colors.muted }
                      ]}
                    >
                      {pushStatus.message}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View
                style={[
                  styles.syncActionColumn,
                  { marginLeft: 8 }
                ]}
              >
                <Pressable
                  style={[
                    styles.outlineButton,
                    styles.syncActionButton,
                    {
                      borderColor: getStatusColor(
                        pullStatus.status
                      )
                    }
                  ]}
                  onPress={syncFromMaster}
                  disabled={pulling}
                >
                  {pulling ? (
                    <ActivityIndicator
                      color={colors.iconActive}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.outlineButtonText,
                        {
                          color: getStatusColor(
                            pullStatus.status
                          )
                        }
                      ]}
                    >
                      Sync From Master DB
                    </Text>
                  )}
                </Pressable>

                <View
                  style={[
                    styles.syncStatusMeta,
                    {
                      borderColor: getStatusColor(
                        pullStatus.status
                      )
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.syncStatusMetaLabel,
                      { color: colors.muted }
                    ]}
                  >
                    Sync From Master status
                  </Text>
                  <Text
                    style={[
                      styles.syncStatusMetaText,
                      { color: colors.text }
                    ]}
                  >
                    {getStatusLabel(pullStatus.status)}
                  </Text>
                  <Text
                    style={[
                      styles.syncStatusMetaTimestamp,
                      { color: colors.muted }
                    ]}
                  >
                    Last update:{" "}
                    {formatSyncTimestamp(
                      pullStatus.timestamp
                    )}
                  </Text>
                  {pullStatus.message ? (
                    <Text
                      style={[
                        styles.syncStatusMetaMessage,
                        { color: colors.muted }
                      ]}
                    >
                      {pullStatus.message}
                    </Text>
                  ) : null}
                </View>
              </View>
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
                        : colors.iconActive
                  }
                ]}
              >
                {syncServerUrl
                  ? overallStatus.status === "failed"
                    ? "Unstable"
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

  syncButtonsGrid: {
    flexDirection: "row",
    marginTop: 16
  },

  syncActionColumn: {
    flex: 1
  },

  syncActionButton: {
    borderWidth: 2
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
