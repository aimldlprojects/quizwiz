import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import { Tabs, useRouter } from "expo-router"
import { useEffect } from "react"
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View
} from "react-native"

import GlobalSyncButton from "@/components/GlobalSyncButton"
import { useDatabase } from "@/hooks/useDatabase"
import { useSettings } from "@/hooks/useSettings"
import { useStudyPreferences } from "@/hooks/useStudyPreferences"
import { useUsers } from "@/hooks/useUsers"
import { getThemeColors } from "@/styles/theme"

export default function TabLayout() {

  const router = useRouter()
  const {
    db,
    loading: dbLoading
  } = useDatabase()
  const {
    activeUser,
    hydrated: usersHydrated,
    loading: usersLoading
  } = useUsers(db)
  const {
    syncMode,
    syncIntervalMs
  } = useSettings(db)
  const { themeMode } = useStudyPreferences(
    db,
    activeUser
  )
  const colors = getThemeColors(themeMode)
  const debugPrefix = "[NAV_DEBUG tabs-layout]"

  useEffect(() => {
    console.log(
      `${debugPrefix} state`,
      JSON.stringify({
        dbLoading,
        hasDb: !!db,
        usersLoading,
        activeUser
      })
    )
  }, [activeUser, db, dbLoading, usersLoading])

  useEffect(() => {
    if (dbLoading || usersLoading || !db || !usersHydrated) {
      return
    }

    if (!activeUser) {
      console.log(
        `${debugPrefix} redirect-to-users`,
        JSON.stringify({
          dbLoading,
          hasDb: !!db,
          usersLoading,
          activeUser
        })
      )
      router.replace("/users")
    }
  }, [
    activeUser,
    db,
    dbLoading,
    router,
    usersLoading
    ,
    usersHydrated
  ])

  if (dbLoading || usersLoading || !db || !usersHydrated || !activeUser) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background }
        ]}
      >
        <ActivityIndicator color={colors.text} />
        <Text
          style={[
            styles.loadingText,
            { color: colors.text }
          ]}
        >
          Loading profile...
        </Text>
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
              activeUser={activeUser}
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
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "700"
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
