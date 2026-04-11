import { useRouter } from "expo-router"
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useMemo, useRef, useState } from "react"

import BootstrapLoadingCard from "@/components/BootstrapLoadingCard"
import { useDatabase } from "@/hooks/useDatabase"
import { useDeviceRegistry } from "@/hooks/useDeviceRegistry"
import { useStudyPreferences } from "@/hooks/useStudyPreferences"
import { useUsers } from "@/hooks/useUsers"
import { getThemeColors } from "@/styles/theme"

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
  const router = useRouter()

  const {
    db,
    loading: dbLoading,
    stageLabel,
    progress
  } =
    useDatabase()

  const {
    users,
    activeUser,
    hydrated: usersHydrated,
    selectUser,
    loading
  } = useUsers(db, true)
  const {
    visibleDevices,
    activeDevice,
    activeDeviceKey,
    setActiveDevice,
    loading: deviceLoading
  } = useDeviceRegistry(db, activeUser)
  const { themeMode } =
    useStudyPreferences(db, activeUser)
  const colors = getThemeColors(themeMode)
  const listRef =
    useRef<FlatList<(typeof users)[number]> | null>(
      null
    )
  const pageScrollRef =
    useRef<ScrollView | null>(null)
  const deviceCardYRef = useRef(0)
  const continueButtonYRef = useRef(0)
  const cardBaseStyle = {
    backgroundColor: colors.card,
    borderColor: colors.border
  }
  const enabledUsers = useMemo(() => {
    return users.filter((user) => user.disabled !== 1)
  }, [users])
  const displayUsers =
    enabledUsers.length > 0 ? enabledUsers : users
  const hasUsers = users.length > 0
  const orderedUsers = useMemo(() => {
    return displayUsers.filter((user) => user.id != null)
  }, [displayUsers])

  if (dbLoading || loading || deviceLoading || !usersHydrated) {
    const progressPercent = Math.min(
      Math.max(Math.round(progress * 100), 0),
      100
    )

    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background }
        ]}
      >
        <BootstrapLoadingCard
          colors={colors}
          title="Preparing quizwiz.db"
          stageLabel={stageLabel}
          progressPercent={progressPercent}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background }
      ]}
    >
      <ScrollView
        ref={pageScrollRef}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >

      {hasUsers ? (
        <View
          style={[
            styles.usersCard,
            cardBaseStyle
          ]}
        >
          <Text
            style={[
              styles.usersTitle,
              { color: colors.text }
            ]}
          >
            Choose user
          </Text>

          <Text
            style={[
              styles.usersSubtitle,
              { color: colors.muted }
            ]}
          >
            Tap a profile card. Scroll to see more users.
          </Text>
          {enabledUsers.length === 0 && users.length > 0 ? (
            <Text
              style={[
                styles.usersSubtitle,
                { color: colors.muted, marginTop: 6 }
              ]}
            >
              All profiles are currently disabled, so they are shown here in muted form.
            </Text>
          ) : null}

          <FlatList
            ref={listRef}
            data={orderedUsers}
            keyExtractor={(item) =>
              String(item.id)
            }
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
            renderItem={({ item, index }) => {

              const isActive =
                activeUser === item.id

              return (
                <Pressable
                  style={[
                    styles.card,
                    cardBaseStyle,
                    isActive && styles.activeCard
                  ]}
                onPress={async () => {
                  try {
                    await selectUser(item.id)
                  } catch (error) {
                    console.error(
                      "Failed to change active user:",
                      error
                      )
                    }
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

                  {item.disabled === 1 ? (
                    <View style={styles.disabledPill}>
                      <Text style={styles.disabledPillText}>
                        Disabled
                      </Text>
                    </View>
                  ) : null}

                  <Text
                    style={[
                      styles.cardName,
                      item.disabled === 1 && styles.disabledCardName,
                      { color: colors.text }
                    ]}
                  >
                    {item.name}
                  </Text>

                </Pressable>
              )

            }}
          />
        </View>
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

        {activeUser != null ? (
          <View
            style={[
              styles.deviceCard,
              cardBaseStyle
            ]}
            onLayout={(event) => {
              deviceCardYRef.current =
                event.nativeEvent.layout.y
            }}
          >
          <Text
            style={[
              styles.deviceSubtitle,
              { color: colors.muted, marginBottom: 10 }
            ]}
          >
            {users.find((user) => user.id === activeUser)
              ?.name ?? "Selected profile"}
            {activeDevice?.displayName
              ? ` · ${activeDevice.displayName}`
              : ""}
          </Text>

          <Text
            style={[
              styles.deviceTitle,
              { color: colors.text }
            ]}
          >
            Available devices
          </Text>

          <Text
            style={[
              styles.deviceSubtitle,
              { color: colors.muted }
            ]}
          >
            Choose the device for this profile before continuing.
          </Text>

          {visibleDevices.length > 0 ? (
            <>
              <View style={styles.deviceChipRow}>
                {visibleDevices.map((device) => (
                  <Pressable
                    key={device.backendKey}
                    style={[
                      styles.deviceChip,
                      {
                        borderColor:
                          activeDeviceKey === device.backendKey
                            ? colors.iconActive
                            : colors.border,
                        backgroundColor:
                          activeDeviceKey === device.backendKey
                            ? "rgba(37, 99, 235, 0.1)"
                            : colors.surface
                        ,
                        transform:
                          activeDeviceKey === device.backendKey
                            ? [{ scale: 1.04 }]
                            : [{ scale: 1 }]
                      }
                    ]}
                    onPress={async () => {
                      try {
                        await setActiveDevice(
                          device.backendKey
                        )
                        requestAnimationFrame(() => {
                          pageScrollRef.current?.scrollTo({
                            y: continueButtonYRef.current,
                            animated: true
                          })
                        })
                      } catch (error) {
                        console.error(
                          "Failed to set active device:",
                          error
                        )
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.deviceChipText,
                        { color: colors.text }
                      ]}
                    >
                      {device.displayName}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[
                  styles.continueButton,
                  { backgroundColor: colors.iconActive }
                ]}
                onLayout={(event) => {
                  continueButtonYRef.current =
                    event.nativeEvent.layout.y
                }}
                onPress={async () => {
                  if (activeUser == null) {
                    return
                  }

                  const selectedUserId = activeUser
                  try {
                    await selectUser(selectedUserId)
                  } catch (error) {
                    console.error(
                      "Failed to persist active user before continue:",
                      error
                    )
                  }

                  void (async () => {
                    if (!activeDevice && visibleDevices[0]) {
                      try {
                        await setActiveDevice(
                          visibleDevices[0].backendKey
                        )
                      } catch (error) {
                        console.error(
                          "Failed to set active device after continue:",
                          error
                        )
                      }
                    }
                  })()

                  router.replace({
                    pathname: "/(tabs)/topics",
                    params: {
                      activeUser: String(selectedUserId)
                    }
                  })
                }}
              >
                <Text style={styles.continueButtonText}>
                  Continue
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.deviceSubtitle,
                  { color: colors.muted }
                ]}
              >
                No device is registered for this profile yet.
              </Text>
              <Pressable
                style={[
                  styles.adminButton,
                  { marginTop: 12, marginBottom: 0 }
                ]}
                onPress={() => router.push("/admin")}
              >
              <Text style={styles.adminButtonText}>
                  Add device in Admin
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      </ScrollView>
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
    backgroundColor: "#f8fbff",
    padding: 20
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
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12
  },

  pageContent: {
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12
  },

  row: {
    justifyContent: "space-between"
  },

  card: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
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
    shadowOpacity: 0.16,
    elevation: 6
  },

  usersCard: {
    marginTop: 12,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 12,
    borderWidth: 2,
    borderColor: "#bfdbfe"
  },

  usersTitle: {
    fontSize: 18,
    fontWeight: "800"
  },

  usersSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16
  },

  resumeCard: {
    marginTop: 18,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    borderWidth: 2,
    borderColor: "#bfdbfe"
  },

  resumeLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },

  resumeTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4
  },

  resumeText: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20
  },

  resumeButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center"
  },

  resumeButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff"
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },

  avatarText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff"
  },

  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a5f",
    textAlign: "center"
  },

  disabledCardName: {
    opacity: 0.6
  },

  disabledPill: {
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    backgroundColor: "#e2e8f0"
  },

  disabledPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#475569"
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
  },

  deviceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 12,
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#93c5fd",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4
    },
    elevation: 2
  },

  deviceTitle: {
    fontSize: 17,
    fontWeight: "800"
  },

  deviceSubtitle: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15
  },

  deviceChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },

  deviceChip: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8
  },

  deviceChipText: {
    fontSize: 13,
    fontWeight: "700"
  },

  continueButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center"
  },

  continueButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff"
  },

})
