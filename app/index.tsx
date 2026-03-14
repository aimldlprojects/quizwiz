import { useRouter } from "expo-router"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useEffect, useState } from "react"

import HomeStats from "../components/HomeStats"

import { StreakController } from "../controllers/streakController"
import { StatsRepository } from "../database/statsRepository"

import { useBackupManager } from "../hooks/useBackupManager"

import { useDatabase } from "@/hooks/useDatabase"
import { useStudyPreferences } from "@/hooks/useStudyPreferences"
import { useUsers } from "@/hooks/useUsers"
import { getThemeColors } from "@/styles/theme"

export default function HomeScreen() {

  const router = useRouter()

  const { db, loading } = useDatabase()

  const { activeUser } = useUsers(db)
  const { themeMode } =
    useStudyPreferences(db, activeUser)
  const colors = getThemeColors(themeMode)

  const backupManager =
    useBackupManager(db ?? null)

  const [streak, setStreak] =
    useState<number>(0)

  const userId = activeUser ?? 1

  useEffect(() => {

    if (loading) return

    if (!activeUser) {
      router.replace("/users")
      return
    }

    router.replace("/topics")

  }, [loading, activeUser, router])

  useEffect(() => {

    const loadStreak = async () => {

      if (!db) return

      const controller =
        new StreakController(db)

      const state =
        await controller.getStreak(
          userId
        )

      setStreak(
        state.currentStreak
      )

    }

    loadStreak()

  }, [db, userId])

  if (loading || !db) {
    return <Text>Loading database...</Text>
  }

  const statsRepo =
    new StatsRepository(db)

  function goPractice() {
    router.push("/practice")
  }

  function goLearn() {
    router.push("/learn")
  }

  function goProgress() {
    router.push("/progress")
  }

  function renderTitle() {

    return (
      <Text
        style={[styles.title, { color: colors.text }]}
      >
        QuizWiz
      </Text>
    )

  }

  function renderStats() {

    return (

      <View>

        <HomeStats
          statsRepo={statsRepo}
          userId={userId}
        />

        <Text
          style={{
            textAlign: "center",
            fontSize: 18,
            marginTop: 10,
            color: colors.muted
          }}
        >
          🔥 Streak: {streak} days
        </Text>

      </View>

    )

  }

  function renderMainActions() {

    return (

      <View style={styles.actions}>

        <Pressable
          style={[
            styles.button,
            { backgroundColor: colors.iconActive }
          ]}
          onPress={goPractice}
        >
          <Text
            style={[
              styles.buttonText,
              { color: "#fff" }
            ]}
          >
            Start Practice
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            { backgroundColor: colors.iconActive }
          ]}
          onPress={goLearn}
        >
          <Text
            style={[
              styles.buttonText,
              { color: "#fff" }
            ]}
          >
            Learn
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            { backgroundColor: colors.iconActive }
          ]}
          onPress={goProgress}
        >
          <Text
            style={[
              styles.buttonText,
              { color: "#fff" }
            ]}
          >
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
