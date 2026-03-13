import { useEffect, useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { StatsRepository } from "../../database/statsRepository"
import { StreakController } from "../../controllers/streakController"
import { useDatabase } from "../../hooks/useDatabase"
import { useUsers } from "../../hooks/useUsers"

export default function ProgressScreen() {

  const { db, loading } = useDatabase()
  const {
    activeUser,
    loading: usersLoading
  } = useUsers(db)

  const [accuracy, setAccuracy] =
    useState(0)
  const [topics, setTopics] =
    useState<any[]>([])
  const [subjects, setSubjects] =
    useState<any[]>([])
  const [streak, setStreak] =
    useState(0)

  useEffect(() => {

    async function loadProgress() {

      if (!db || !activeUser) return

      const statsRepo =
        new StatsRepository(db)
      const streakController =
        new StreakController(db)

      const acc =
        await statsRepo.getAccuracy(activeUser)

      const topicData =
        await statsRepo.getTopicProgress(
          activeUser
        )

      const subjectData =
        await statsRepo.getSubjectProgress(
          activeUser
        )

      const streakState =
        await streakController.getStreak(
          activeUser
        )

      setAccuracy(acc)
      setTopics(topicData)
      setSubjects(subjectData)
      setStreak(streakState.currentStreak)

    }

    loadProgress()

  }, [db, activeUser])

  if (loading || usersLoading || !db) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading progress...
        </Text>
      </SafeAreaView>
    )
  }

  if (!activeUser) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Choose a user profile first.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>
          Progress Map
        </Text>

        <View style={styles.heroCard}>
          <Text style={styles.cardTitle}>
            Overall Accuracy
          </Text>

          <Text style={styles.bigValue}>
            {accuracy}%
          </Text>

          <Text style={styles.heroSubtext}>
            Current streak: {streak} day{streak === 1 ? "" : "s"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Topics
          </Text>

          {topics.map((topic) => (
            <View
              key={topic.topicId}
              style={styles.row}
            >
              <Text style={styles.rowLabel}>
                {topic.topicName}
              </Text>

              <Text style={styles.rowValue}>
                {topic.progress}%
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Subjects
          </Text>

          {subjects.map((subject) => (
            <View
              key={subject.subjectId}
              style={styles.row}
            >
              <Text style={styles.rowLabel}>
                {subject.subjectName}
              </Text>

              <Text style={styles.rowValue}>
                {subject.progress}%
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )

}

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: "#f8fbff"
  },

  container: {
    flex: 1,
    padding: 20
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fbff"
  },

  loadingText: {
    fontSize: 18,
    color: "#1e3a5f"
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
    color: "#1e3a5f"
  },

  heroCard: {
    backgroundColor: "#dbeafe",
    padding: 20,
    borderRadius: 24,
    marginBottom: 16
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 22,
    marginBottom: 16
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
    color: "#1e3a5f"
  },

  bigValue: {
    fontSize: 40,
    textAlign: "center",
    fontWeight: "800",
    color: "#1d4ed8"
  },

  heroSubtext: {
    textAlign: "center",
    marginTop: 10,
    color: "#475569",
    fontSize: 16,
    fontWeight: "700"
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6
  },

  rowLabel: {
    fontSize: 16,
    color: "#475569"
  },

  rowValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a5f"
  }

})
