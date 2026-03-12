import { Button, Switch, Text, View } from "react-native"

import { useDatabase } from "@/hooks/useDatabase"
import { useSettings } from "@/hooks/useSettings"

import { testMultiDeviceSync } from "@/services/sync/testMultiDeviceSync"

export default function SettingsScreen() {

    const { db, loading: dbLoading } = useDatabase()

  const {
    syncMode,
    updateSyncMode,
      loading: settingsLoading
  } = useSettings(db)

    if (!db || dbLoading || settingsLoading) {
    return <Text>Loading...</Text>
  }

  const hybridEnabled =
    syncMode === "hybrid"

    async function runSyncTest() {

        if (!db) return

        await testMultiDeviceSync(
            db,
            "http://YOUR_SERVER_IP:8000",
            1
        )

    }

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

          <View style={{ marginTop: 30 }}>

              <Button
                  title="Test Multi Device Sync"
                  onPress={runSyncTest}
              />

          </View>

    </View>

  )

}