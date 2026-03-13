import { useRouter } from "expo-router"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useDatabase } from "@/hooks/useDatabase"
import { useSettings } from "@/hooks/useSettings"
import { useStudyPreferences } from "@/hooks/useStudyPreferences"
import { getSyncServerUrl } from "@/services/sync/config"
import { testMultiDeviceSync } from "@/services/sync/testMultiDeviceSync"
import { useUsers } from "@/hooks/useUsers"

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
  } = useUsers(db)
  const {
    ttsEnabled,
    setTtsEnabled,
    loading: preferencesLoading
  } = useStudyPreferences(db)

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
    users.find((user) => user.id === activeUser)

  const hybridEnabled =
    syncMode === "hybrid"

  async function runSyncTest() {

    if (!db || !activeUser) return

    const serverUrl =
      getSyncServerUrl()

    if (!serverUrl) {
      console.log(
        "Sync test skipped: sync server URL is not configured."
      )
      return
    }

    await testMultiDeviceSync(
      db,
      serverUrl,
      activeUser
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
            onPress={runSyncTest}
          >
            <Text style={styles.secondaryButtonText}>
              Test Sync
            </Text>
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
