import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import {
  Tabs,
  useLocalSearchParams,
  useRouter
} from "expo-router"
import { useEffect, useMemo } from "react"
import { StyleSheet, View } from "react-native"

import GlobalSyncButton from "@/components/GlobalSyncButton"
import BootstrapLoadingCard from "@/components/BootstrapLoadingCard"
import { useDatabase } from "@/hooks/useDatabase"
import { useDeviceRegistry } from "@/hooks/useDeviceRegistry"
import { useSettings } from "@/hooks/useSettings"
import { useStudyPreferences } from "@/hooks/useStudyPreferences"
import { useUsers } from "@/hooks/useUsers"
import { getThemeColors } from "@/styles/theme"

export default function TabLayout() {

  const router = useRouter()
  const params = useLocalSearchParams<{
    activeUser?: string | string[]
  }>()
  const {
    db,
    loading: dbLoading,
    stageLabel,
    progress,
    error
  } = useDatabase()
  const {
    activeUser,
    hydrated: usersHydrated,
    loading: usersLoading
  } = useUsers(db)
  const { activeDeviceKey } =
    useDeviceRegistry(db, activeUser)
  const activeUserFromRoute = useMemo(() => {
    const raw = params.activeUser
    const value = Array.isArray(raw) ? raw[0] : raw
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : null
  }, [params.activeUser])
  const resolvedActiveUser =
    activeUser ?? activeUserFromRoute
  const {
    syncMode,
    syncIntervalMs
  } = useSettings(db)
  const { themeMode } = useStudyPreferences(
    db,
    resolvedActiveUser
  )
  const colors = getThemeColors(themeMode)

  useEffect(() => {
    if (dbLoading || !db) {
      return
    }

    if (
      !resolvedActiveUser &&
      usersHydrated &&
      !usersLoading
    ) {
      router.replace("/users")
    }
  }, [
    db,
    dbLoading,
    router,
    usersLoading,
    usersHydrated,
    resolvedActiveUser
  ])

  if (dbLoading || !db) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background }
        ]}
      >
        <BootstrapLoadingCard
          colors={colors}
          title="Preparing quizwiz.db"
          stageLabel={stageLabel}
          progressPercent={Math.min(
            Math.max(Math.round(progress * 100), 0),
            100
          )}
          message={error}
          messageColor="#b45309"
          compact
        />
      </View>
    )
  }

  return (
    <Tabs
      key={themeMode}
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitle: getTabTitle(route.name),
        headerTitleStyle: {
          color: colors.text,
          fontWeight: "800"
        },
        headerStyle: {
          backgroundColor: colors.background
        },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <GlobalSyncButton
              db={db}
              activeUser={resolvedActiveUser}
              deviceKey={activeDeviceKey}
              syncMode={syncMode}
              syncIntervalMs={syncIntervalMs}
              colors={colors}
              variant="inline"
            />
          </View>
        ),
        tabBarActiveTintColor: colors.iconActive,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 74,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700"
        },
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons
            name={getTabIcon(route.name)}
            color={color}
            size={size}
          />
        )
      })}
    >
      <Tabs.Screen
        name="topics"
        options={{ title: "Topics" }}
      />
      <Tabs.Screen
        name="learn"
        options={{ title: "Learn" }}
      />
      <Tabs.Screen
        name="practice"
        options={{ title: "Practice" }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: "Progress" }}
      />
      <Tabs.Screen
        name="badges"
        options={{ title: "Badges" }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile" }}
      />
    </Tabs>
  )

}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  }
})

function getTabIcon(routeName: string) {

  switch (routeName) {
    case "learn":
      return "menu-book"
    case "topics":
      return "category"
    case "practice":
      return "sports-esports"
    case "progress":
      return "bar-chart"
    case "badges":
      return "military-tech"
    case "profile":
      return "face"
    default:
      return "circle"
  }

}

function getTabTitle(routeName: string) {

  switch (routeName) {
    case "learn":
      return "Learn"
    case "topics":
      return "Topics"
    case "practice":
      return "Practice"
    case "progress":
      return "Progress"
    case "badges":
      return "Badges"
    case "profile":
      return "Profile"
    default:
      return ""
  }

}
