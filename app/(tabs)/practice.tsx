import { useMemo } from "react"
import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { usePractice } from "../../hooks/usePractice"

import AnswerActions from "../../components/AnswerActions"
import ScoreHeader from "../../components/ScoreHeader"

import { PracticeController } from "../../controllers/practiceController"
import { QuestionQueue } from "../../engine/practice/questionQueue"
import { BatchLoader } from "../../engine/questions/batchLoader"
import { ReviewScheduler } from "../../engine/scheduler/reviewScheduler"

import { ReviewRepository } from "../../database/reviewRepository"
import { useDatabase } from "../../hooks/useDatabase"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"
import { useUsers } from "../../hooks/useUsers"
import { ttsService } from "../../services/ttsService"

export default function PracticeScreen() {

  const { db, loading } = useDatabase()
  const {
    activeUser,
    loading: usersLoading
  } = useUsers(db)
  const {
    selectedTopicId,
    ttsEnabled,
    setTtsEnabled,
    loading: preferencesLoading
  } = useStudyPreferences(db)

  const controller = useMemo(() => {

    if (!db || !activeUser) return null

    const scheduler = new ReviewScheduler({
      questions: [],
      reviews: []
    })

    const queue = new QuestionQueue({
      loadQuestions: async (limit: number) => {

        if (selectedTopicId) {
          return db.getAllAsync(
            `
            SELECT
              id,
              question,
              answer
            FROM questions
            WHERE topic_id = ?
            ORDER BY RANDOM()
            LIMIT ?
            `,
            [selectedTopicId, limit]
          )
        }

        const batchLoader = new BatchLoader({
          batchSize: limit
        })

        return batchLoader.loadBatch()

      }
    })

    const repo = new ReviewRepository(db)

    return new PracticeController(
      activeUser,
      scheduler,
      queue,
      repo
    )

  }, [db, activeUser, selectedTopicId])

  const practice = usePractice(controller)

  if (
    loading ||
    usersLoading ||
    preferencesLoading ||
    !db
  ) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading practice...
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

  if (!selectedTopicId) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Choose a topic in the Topics tab first.
        </Text>
      </SafeAreaView>
    )
  }

  if (!practice.question && practice.loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Preparing questions...
        </Text>
      </SafeAreaView>
    )
  }

  function renderQuestion() {

    if (!practice.question) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            No question ready yet
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={practice.startPractice}
          >
            <Text style={styles.retryButtonText}>
              Start Practice
            </Text>
          </Pressable>
        </View>
      )
    }

    return (
      <Text style={styles.question}>
        {practice.question.question}
      </Text>
    )

  }

  function renderResult() {

    if (!practice.result) return null

    if (practice.result.correct) {
      return (
        <Text style={styles.correct}>
          Correct answer. Great job.
        </Text>
      )
    }

    return (
      <Text style={styles.wrong}>
        Try again next time. Correct answer:{" "}
        {practice.result.correctAnswer}
      </Text>
    )

  }

  function replayQuestion() {

    if (!practice.question) return

    ttsService.speak(practice.question.question)

  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.screenTitle}>
              Practice Arena
            </Text>

            <View style={styles.headerActions}>
              <Pressable
                style={styles.iconButton}
                onPress={() =>
                  setTtsEnabled(!ttsEnabled)
                }
              >
                <MaterialIcons
                  name={
                    ttsEnabled
                      ? "volume-up"
                      : "volume-off"
                  }
                  size={20}
                  color="#ffffff"
                />
              </Pressable>

              <Pressable
                style={styles.iconButton}
                onPress={replayQuestion}
              >
                <MaterialIcons
                  name="play-arrow"
                  size={20}
                  color="#ffffff"
                />
              </Pressable>
            </View>
          </View>

          <ScoreHeader
            attempts={practice.stats.attempts}
            correct={practice.stats.correct}
            accuracy={practice.accuracy}
          />
        </View>

        <View style={styles.questionCard}>
          {renderQuestion()}

          {practice.question ? (
            <>
              <TextInput
                style={styles.input}
                value={practice.answer}
                onChangeText={practice.setAnswer}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={() =>
                  practice.submitAnswer("good")
                }
                placeholder="Type your answer"
                placeholderTextColor="#8d99ae"
              />

              {renderResult()}
            </>
          ) : null}
        </View>

        {practice.question ? (
          <View style={styles.actionsCard}>
          <AnswerActions
            answered={!!practice.result}
            onSubmit={() =>
              practice.submitAnswer("good")
            }
            onNext={() =>
              practice.nextQuestion()
            }
            onRate={() => {}}
          />
        </View>
      ) : null}
      </View>
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

  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },

  headerActions: {
    flexDirection: "row",
    gap: 10
  },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center"
  },

  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e3a5f",
    marginBottom: 12,
    flex: 1
  },

  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginTop: 18
  },

  question: {
    fontSize: 34,
    textAlign: "center",
    marginBottom: 24,
    color: "#1e3a5f",
    fontWeight: "800"
  },

  input: {
    borderWidth: 2,
    borderColor: "#93c5fd",
    backgroundColor: "#eff6ff",
    padding: 14,
    borderRadius: 16,
    fontSize: 22,
    textAlign: "center"
  },

  correct: {
    color: "#2d6a4f",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "700"
  },

  wrong: {
    color: "#d62828",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "700"
  },

  actionsCard: {
    marginTop: 18,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18
  },

  emptyCard: {
    alignItems: "center",
    paddingBottom: 10
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e3a5f",
    textAlign: "center",
    marginBottom: 16
  },

  retryButton: {
    backgroundColor: "#f97316",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12
  },

  retryButtonText: {
    color: "#ffffff",
    fontWeight: "800"
  }

})
