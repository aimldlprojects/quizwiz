// app/index.tsx

import { useRouter } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { SafeAreaView } from "react-native-safe-area-context"
import HomeStats from "../components/HomeStats"
import { StatsRepository } from "../database/statsRepository"
import { useBackupManager } from "../hooks/useBackupManager"
import { useDatabase } from "../hooks/useDatabase"

export default function HomeScreen() {

  const { db, ready } = useDatabase()

  const backupManager = useBackupManager(db ?? null)

  const router = useRouter()

  if (!ready || !db) {
    return <Text>Loading database...</Text>
  }

  const statsRepo = new StatsRepository(db)

  const userId = 1

  // ---------- navigation helpers ----------

  function goPractice() {
    router.push("/practice")
  }

  function goLearn() {
    router.push("/learn")
  }

  function goProgress() {
    router.push("/progress")
  }

  // ---------- render title ----------

  function renderTitle() {

    return (
      <Text style={styles.title}>
        QuizWiz
      </Text>
    )

  }

  // ---------- render stats ----------

  function renderStats() {

    return (
      <HomeStats
        statsRepo={statsRepo}
        userId={userId}
      />
    )

  }

  // ---------- render main actions ----------

  function renderMainActions() {

    return (

      <View style={styles.actions}>

        <Pressable
          style={styles.button}
          onPress={goPractice}
        >
          <Text style={styles.buttonText}>
            Start Practice
          </Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={goLearn}
        >
          <Text style={styles.buttonText}>
            Learn
          </Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={goProgress}
        >
          <Text style={styles.buttonText}>
            Progress
          </Text>
        </Pressable>

      </View>

    )

  }

  return (

    <SafeAreaView style={styles.container}>

      {renderTitle()}
      {renderStats()}
      {renderMainActions()}

    </SafeAreaView>

  )

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center"
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20
  },

  actions: {
    marginTop: 20
  },

  button: {
    backgroundColor: "#4caf50",
    padding: 14,
    borderRadius: 10,
    marginVertical: 6
  },

  buttonText: {
    textAlign: "center",
    fontSize: 18,
    color: "#fff",
    fontWeight: "600"
  }

})