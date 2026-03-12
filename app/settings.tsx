import { useDatabase } from "@/hooks/useDatabase"
import { useSettings } from "@/hooks/useSettings"
import { Switch, Text, View } from "react-native"

export default function SettingsScreen() {

  const { db } = useDatabase()

  const {
    syncMode,
    updateSyncMode,
    loading
  } = useSettings(db)

  if (loading) {
    return <Text>Loading...</Text>
  }

  const hybridEnabled =
    syncMode === "hybrid"

  return (

    <View style={{ padding: 20 }}>

      <Text style={{ fontSize: 20 }}>
        Sync Mode
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 20
        }}
      >

        <Text style={{ marginRight: 10 }}>
          Local
        </Text>

        <Switch
          value={hybridEnabled}
          onValueChange={(v) =>
            updateSyncMode(
              v ? "hybrid" : "local"
            )
          }
        />

        <Text style={{ marginLeft: 10 }}>
          Hybrid
        </Text>

      </View>

    </View>

  )

}