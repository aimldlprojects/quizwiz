import { useRouter } from "expo-router"
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  ActivityIndicator,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useDatabase } from "@/hooks/useDatabase"
import { useSettings } from "@/hooks/useSettings"
import { useStudyPreferences } from "@/hooks/useStudyPreferences"
import { getSyncServerUrl } from "@/services/sync/config"
import { syncReviews } from "@/services/sync/syncReviews"
import { useUsers } from "@/hooks/useUsers"
import { useState } from "react"

function getAvatarLetter(name: string) {

  return name.trim().charAt(0).toUpperCase() || "Q"

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
    loading: preferencesLoading
  } = useStudyPreferences(
    db,
    activeUser
  )
  const [syncing, setSyncing] =
    useState(false)

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

  async function syncProfileData() {

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
      >
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getAvatarLetter(
                currentUser?.name ?? "QuizWiz"
              )}
            </Text>
          </View>

          <Text style={styles.heroLabel}>
            Active Profile
          </Text>

          <Text style={styles.heroName}>
            {currentUser?.name ?? "No profile selected"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Change player
          </Text>

          <Text style={styles.cardText}>
            Switch profiles any time without
            leaving the app.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/users")}
          >
            <Text style={styles.primaryButtonText}>
              Change User
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Sync settings
          </Text>

          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>
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

            <Text style={styles.syncLabel}>
              Hybrid
            </Text>
          </View>

          <Pressable
            style={styles.secondaryButton}
            onPress={syncProfileData}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                Sync To Global DB
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Voice settings
          </Text>

          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>
              Read questions aloud
            </Text>

            <Switch
              value={ttsEnabled}
              onValueChange={setTtsEnabled}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Practice navigation
          </Text>

          <Text style={styles.cardText}>
            Move to the next question automatically after each answer.
          </Text>

          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>
              Auto next
            </Text>

            <Switch
              value={autoNextEnabled}
              onValueChange={setAutoNextEnabled}
            />
          </View>

          <View style={styles.delayRow}>
            <Text style={styles.delayLabel}>
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

              <Text style={styles.delayValue}>
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
            <Text style={styles.delayLabel}>
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

              <Text style={styles.delayValue}>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Learn navigation
          </Text>

          <Text style={styles.cardText}>
            Auto flip flash cards and move to the next card after the answer side is shown.
          </Text>

          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>
              Auto play learn cards
            </Text>

            <Switch
              value={learnAutoPlayEnabled}
              onValueChange={setLearnAutoPlayEnabled}
            />
          </View>

          <View style={styles.delayRow}>
            <Text style={styles.delayLabel}>
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

              <Text style={styles.delayValue}>
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
            <Text style={styles.delayLabel}>
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

              <Text style={styles.delayValue}>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Admin tools
          </Text>

          <Text style={styles.cardText}>
            Add or remove learner profiles with
            the admin password.
          </Text>

          <Pressable
            style={styles.adminButton}
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

  syncLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a5f"
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
    fontSize: 16,
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
