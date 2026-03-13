import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import { useEffect, useMemo, useState } from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import AnswerActions from "../../components/AnswerActions"
import ScoreHeader from "../../components/ScoreHeader"
import { PracticeController } from "../../controllers/practiceController"
import {
  getAllTopics,
  getDescendantTopicIds,
  getQuestionsForTopicTree,
  getTopicById,
  TopicRecord
} from "../../database/contentRepository"
import { ReviewRepository } from "../../database/reviewRepository"
import { QuestionQueue } from "../../engine/practice/questionQueue"
import { BatchLoader } from "../../engine/questions/batchLoader"
import { generateQuestionBatch } from "../../engine/questions/questionFactory"
import { ReviewScheduler } from "../../engine/scheduler/reviewScheduler"
import { useDatabase } from "../../hooks/useDatabase"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"
import { useUsers } from "../../hooks/useUsers"
import { ttsService } from "../../services/ttsService"
import { usePractice } from "../../hooks/usePractice"

function getKeyboardType(answer: unknown) {

  if (
    typeof answer === "number" ||
    /^\d+([/.]\d+)?$/.test(String(answer))
  ) {
    return "numeric" as const
  }

  return "default" as const

}

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
  } = useStudyPreferences(
    db,
    activeUser
  )

  const [selectedTopic, setSelectedTopic] =
    useState<TopicRecord | null>(null)

  useEffect(() => {

    async function loadTopic() {

      if (!db || !selectedTopicId) {
        setSelectedTopic(null)
        return
      }

      const topic =
        await getTopicById(
          db,
          selectedTopicId
        )

      setSelectedTopic(topic ?? null)

    }

    loadTopic()

  }, [db, selectedTopicId])

  const controller = useMemo(() => {

    if (!db || !activeUser) return null

    const scheduler = new ReviewScheduler({
      questions: [],
      reviews: []
    })

    const repo = new ReviewRepository(db)

    const queue = new QuestionQueue(
      {
        loadQuestions: async (
          limit: number
        ) => {
          if (selectedTopicId) {
            const topic =
              await getTopicById(
                db,
                selectedTopicId
              )
            const topics =
              await getAllTopics(db)
            const topicIds =
              getDescendantTopicIds(
                topics,
                selectedTopicId
              )

            const rows =
              await getQuestionsForTopicTree(
                db,
                topicIds,
                limit
              )

            if (rows.length > 0) {
              return rows.map((row) => ({
                id: row.id,
                question: row.question,
                answer: Number.isNaN(
                  Number(row.answer)
                )
                  ? row.answer
                  : Number(row.answer),
                type: row.type ?? undefined
              }))
            }

            if (topic?.key) {
              const generated =
                generateQuestionBatch(
                  topic.key,
                  limit
                )

              if (generated.length > 0) {
                return generated
              }
            }
          }

          const batchLoader = new BatchLoader({
            batchSize: limit,
            source: "mixed"
          })

          return batchLoader.loadBatch()
        }
      },
      10,
      repo,
      activeUser
    )

    return new PracticeController(
      activeUser,
      scheduler,
      queue,
      repo,
      selectedTopicId ?? null
    )

  }, [db, activeUser, selectedTopicId])

  const practice = usePractice(controller)

  useEffect(() => {

    if (
      !ttsEnabled ||
      !practice.question
    ) {
      return
    }

    ttsService.speak(
      practice.question.question
    )

  }, [ttsEnabled, practice.question])

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

  function replayQuestion() {

    if (!practice.question) return

    ttsService.speak(practice.question.question)

  }

  function renderQuestion() {

    if (!practice.question) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            No question ready yet
          </Text>

          <Text style={styles.emptyText}>
            This topic has no playable content yet.
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={practice.startPractice}
          >
            <Text style={styles.retryButtonText}>
              Try Again
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.screenTitle}>
                Practice Arena
              </Text>

              <Text style={styles.topicLabel}>
                {selectedTopic?.name ??
                  "Selected topic"}
              </Text>
            </View>

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

          <Text style={styles.scoreText}>
            Score: {practice.score}
          </Text>
        </View>

        <View style={styles.questionCard}>
          {renderQuestion()}

          {practice.question ? (
            <>
              <TextInput
                style={styles.input}
                value={practice.answer}
                onChangeText={practice.setAnswer}
                keyboardType={getKeyboardType(
                  practice.question.answer
                )}
                autoCapitalize="none"
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
    alignItems: "flex-start",
    gap: 12
  },

  headerTitleWrap: {
    flex: 1
  },

  topicLabel: {
    color: "#475569",
    fontWeight: "700",
    marginTop: 2
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
    marginBottom: 4
  },

  scoreText: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a5f"
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
    marginBottom: 10
  },

  emptyText: {
    color: "#64748b",
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
