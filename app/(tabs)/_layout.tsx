import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import { Tabs } from "expo-router"

export default function TabLayout() {

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#1d4ed8",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          height: 74,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: "#ffffff",
          borderTopColor: "#bfdbfe"
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
