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

  const {
    db,
    loading,
    stageLabel,
    progress,
    error,
    connectivityStatus
  } = useDatabase()

  const { activeUser } = useUsers(db)
  const { themeMode } =
    useStudyPreferences(db, activeUser)
  const colors = getThemeColors(themeMode)

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

  if (error) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <Text style={styles.errorTitle}>
          Unable to open database
        </Text>
        <Text style={styles.errorMessage}>
          {error}
        </Text>
      </SafeAreaView>
    )
  }

  if (loading || !db) {
    const progressPercent = Math.min(
      Math.max(Math.round(progress * 100), 0),
      100
    )

    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <Text style={styles.loadingTitle}>
          Preparing quizwiz.db
        </Text>
        <Text style={styles.loadingStage}>
          {stageLabel}
        </Text>
        {connectivityStatus ? (
          <Text style={styles.connectivityMessage}>
            {connectivityStatus}
          </Text>
        ) : null}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%`
              }
            ]}
          />
        </View>
        <Text style={styles.loadingDetail}>
          {progressPercent}% complete
        </Text>
      </SafeAreaView>
    )
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
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20
  },

  loadingTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8
  },

  loadingStage: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 16
  },

  progressTrack: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#4caf50"
  },

  loadingDetail: {
    fontSize: 14,
    textAlign: "center",
    color: "#888"
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "#b00020",
    marginBottom: 8
  },

  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    color: "#b00020"
  },

  connectivityMessage: {
    fontSize: 14,
    textAlign: "center",
    color: "#ef4444",
    marginBottom: 12
  }

})
