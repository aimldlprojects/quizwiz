import { router } from "expo-router"
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useDatabase } from "../hooks/useDatabase"
import { useUsers } from "../hooks/useUsers"

function getAvatarColor(index: number) {

  const colors = [
    "#f97316",
    "#0ea5e9",
    "#8b5cf6",
    "#22c55e",
    "#ef4444",
    "#f59e0b"
  ]

  return colors[index % colors.length]

}

export default function UsersScreen() {

  const { db, loading: dbLoading } =
    useDatabase()

  const {
    users,
    activeUser,
    selectUser,
    loading
  } = useUsers(db)

  if (dbLoading || loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading profiles...
        </Text>
      </SafeAreaView>
    )
  }

  const hasUsers = users.length > 0

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          Pick your player
        </Text>

        <Text style={styles.title}>
          Who is learning today?
        </Text>

        <Text style={styles.subtitle}>
          Choose a profile to jump into
          practice and track progress.
        </Text>
      </View>

      {hasUsers ? (
        <FlatList
          data={users}
          keyExtractor={(item) =>
            String(item.id)
          }
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {

            const isActive =
              activeUser === item.id

            return (
              <Pressable
                style={[
                  styles.card,
                  isActive && styles.activeCard
                ]}
                onPress={async () => {
                  await selectUser(item.id)
                  router.replace("/learn")
                }}
              >
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor:
                        getAvatarColor(index)
                    }
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {item.name
                      .trim()
                      .charAt(0)
                      .toUpperCase() || "Q"}
                  </Text>
                </View>

                <Text style={styles.cardName}>
                  {item.name}
                </Text>

                <Text style={styles.cardHint}>
                  {isActive
                    ? "Current profile"
                    : "Tap to continue"}
                </Text>
              </Pressable>
            )

          }}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            No profiles yet
          </Text>

          <Text style={styles.emptyText}>
            Open the admin area to create the
            first learner profile.
          </Text>
        </View>
      )}

      <Pressable
        style={styles.adminButton}
        onPress={() => router.push("/admin")}
      >
        <Text style={styles.adminButtonText}>
          Open Admin
        </Text>
      </Pressable>

    </SafeAreaView>
  )

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f8fbff",
    paddingHorizontal: 20
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
    borderRadius: 24,
    padding: 20,
    marginTop: 12
  },

  eyebrow: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
    textTransform: "uppercase"
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1e3a5f",
    marginTop: 8
  },

  subtitle: {
    fontSize: 16,
    color: "#475569",
    marginTop: 8,
    lineHeight: 22
  },

  listContent: {
    paddingVertical: 20,
    gap: 14
  },

  row: {
    justifyContent: "space-between"
  },

  card: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#bfdbfe",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4
    },
    elevation: 3
  },

  activeCard: {
    borderColor: "#2563eb",
    transform: [{ scale: 1.02 }]
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14
  },

  avatarText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#ffffff"
  },

  cardName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e3a5f",
    textAlign: "center"
  },

  cardHint: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 6,
    textAlign: "center"
  },

  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    marginTop: 20,
    alignItems: "center"
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e3a5f"
  },

  emptyText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22
  },

  adminButton: {
    backgroundColor: "#2563eb",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 20
  },

  adminButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff"
  }

})
