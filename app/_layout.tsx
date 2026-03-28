import { Stack } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View
} from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import GlobalSyncButton from "@/components/GlobalSyncButton"
import { useDatabase } from "@/hooks/useDatabase"
import { useSettings } from "@/hooks/useSettings"
import { useStudyPreferences } from "@/hooks/useStudyPreferences"
import { useSyncLifecycle } from "@/hooks/useSyncLifecycle"
import { useUsers } from "@/hooks/useUsers"
import {
  isSyncActivityActive,
  subscribeSyncActivityChanges
} from "@/database/syncMetaRepository"
import { getThemeColors } from "@/styles/theme"

export default function RootLayout() {

  const { db } = useDatabase()
  const { activeUser, users } = useUsers(db)
  const {
    syncMode,
    syncIntervalMs,
    syncMinGapMs
  } = useSettings(db)
  const { themeMode } = useStudyPreferences(db, activeUser)
  const colors = getThemeColors(themeMode)
  const autoSyncIntervalMs =
    syncMode === "hybrid" ? syncIntervalMs : 0
  useSyncLifecycle(
    db,
    activeUser,
    users.map((user) => user.id),
    autoSyncIntervalMs,
    syncMinGapMs
  )
  const [syncOverlayVisible, setSyncOverlayVisible] =
    useState(isSyncActivityActive())

  useEffect(() => {
    const unsubscribe = subscribeSyncActivityChanges(
      () => {
        setSyncOverlayVisible(
          isSyncActivityActive()
        )
      }
    )

    setSyncOverlayVisible(
      isSyncActivityActive()
    )

    return unsubscribe
  }, [])

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <Stack
          screenOptions={{
            headerShown: true,
            headerShadowVisible: false,
            headerTitleStyle: {
              color: colors.text,
              fontWeight: "800"
            },
            headerStyle: {
              backgroundColor: colors.background
            },
            headerRight: () => (
              <View style={{ marginRight: 8 }}>
                <GlobalSyncButton
                  db={db}
                  activeUser={activeUser}
                  syncMode={syncMode}
                  syncIntervalMs={syncIntervalMs}
                  colors={colors}
                  variant="inline"
                />
              </View>
            )
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
          />
        </Stack>

        {syncOverlayVisible ? (
          <View
            pointerEvents="box-none"
            style={styles.syncOverlay}
          >
            <View
              style={[
                styles.syncOverlayCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border
                }
              ]}
            >
              <ActivityIndicator
                size="small"
                color={colors.text}
              />
              <Text
                style={[
                  styles.syncOverlayText,
                  { color: colors.text }
                ]}
              >
                Syncing...
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaProvider>
  )

}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  syncOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.12)",
    zIndex: 1000,
    elevation: 1000
  },
  syncOverlayCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  syncOverlayText: {
    fontSize: 15,
    fontWeight: "800"
  }
})
