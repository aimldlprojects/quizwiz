import { Stack } from "expo-router"
import { useEffect } from "react"
import { StyleSheet, View } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import GlobalSyncButton from "@/components/GlobalSyncButton"
import { useDatabase } from "@/hooks/useDatabase"
import { useSettings } from "@/hooks/useSettings"
import { useStudyPreferences } from "@/hooks/useStudyPreferences"
import { useSyncLifecycle } from "@/hooks/useSyncLifecycle"
import { useUsers } from "@/hooks/useUsers"
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
  const autoSyncIntervalMs = syncIntervalMs
  useSyncLifecycle(
    db,
    activeUser,
    activeUser ? [activeUser] : [],
    autoSyncIntervalMs,
    syncMinGapMs
  )

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
      </View>
    </SafeAreaProvider>
  )

}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
})
