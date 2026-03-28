import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react"
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useFocusEffect } from "@react-navigation/native"
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
import { StatsRepository } from "../../database/statsRepository"
import { getSyncDirtyAt } from "../../database/syncMetaRepository"
import { getSyncStatus, type SyncStatusRecord } from "../../database/syncStatusRepository"
import { QuestionQueue } from "../../engine/practice/questionQueue"
import { BatchLoader } from "../../engine/questions/batchLoader"
import { generateQuestionBatch } from "../../engine/questions/questionFactory"
import { ReviewScheduler } from "../../engine/scheduler/reviewScheduler"
import { useDatabase } from "../../hooks/useDatabase"
import { usePractice } from "../../hooks/usePractice"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"
import { useUsers } from "../../hooks/useUsers"
import { getSyncServerUrl } from "../../services/sync/config"
import { syncReviews } from "../../services/sync/syncReviews"
import { ttsService } from "../../services/ttsService"
import { getThemeColors } from "../../styles/theme"

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
    autoNextEnabled,
    setAutoNextEnabled,
    autoNextCorrectDelaySeconds,
    autoNextWrongDelaySeconds,
    practiceRandomOrderEnabled,
    setPracticeRandomOrderEnabled,
    themeMode,
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

    if (!db || !activeUser || !selectedTopicId) return null

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
              limit,
              "sequence"
            )

          if (rows.length > 0) {
            const mappedRows = rows.map((row) => ({
              id: row.id,
              question: row.question,
              answer: Number.isNaN(
                Number(row.answer)
              )
                ? row.answer
                : Number(row.answer),
              type: row.type ?? undefined
            }))

            return mappedRows
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

          const batchLoader = new BatchLoader({
            batchSize: limit,
            source: "mixed"
          })

          const batch =
            await batchLoader.loadBatch()

          return batch
        }
      },
      10,
      practiceRandomOrderEnabled
        ? repo
        : undefined,
      practiceRandomOrderEnabled
        ? activeUser
        : undefined
    )

    return new PracticeController(
      activeUser,
      scheduler,
      queue,
      repo,
      selectedTopicId
    )

  }, [
    db,
    activeUser,
    selectedTopicId,
    practiceRandomOrderEnabled
  ])

  const practice = usePractice(controller)
  const practiceQuestion =
    practice.question
  const practiceResult =
    practice.result
  const practiceAnswered =
    practice.answered
  const autoNextQuestion =
    practice.autoNext
  const colors = getThemeColors(themeMode)
  const iconButtonStyle = (active: boolean) => ({
    backgroundColor: active
      ? colors.iconActive
      : colors.iconInactive
  })

  const [practiceAccuracy, setPracticeAccuracy] =
    useState(0)
  const [practiceTotals, setPracticeTotals] =
    useState({
      attempts: 0,
      correct: 0
    })
  const [syncing, setSyncing] = useState(false)
  const [syncInfo, setSyncInfo] =
    useState<SyncStatusRecord | null>(null)
  const [syncDirtyAt, setSyncDirtyAt] =
    useState<number | null>(null)
  const [remoteSyncTime, setRemoteSyncTime] =
    useState<number | null>(null)
  const syncServerUrl = getSyncServerUrl()

  const refreshSyncStatus =
    useCallback(async () => {
      if (!db) return

      const info = await getSyncStatus(db)
      setSyncInfo(info)
    }, [db])

  const refreshSyncIndicators =
    useCallback(async () => {
      if (!db || !activeUser) {
        setSyncDirtyAt(null)
        setRemoteSyncTime(null)
        return
      }

      const dirtyAt = await getSyncDirtyAt(
        db,
        activeUser
      )
      setSyncDirtyAt(dirtyAt || null)

      if (!syncServerUrl) {
        setRemoteSyncTime(null)
        return
      }

      try {
        const response = await fetch(
          `${syncServerUrl}/reviews/status?user_id=${activeUser}`
        )

        if (!response.ok) {
          setRemoteSyncTime(null)
          return
        }

        const json = await response.json()
        setRemoteSyncTime(
          typeof json?.last_sync_time === "number"
            ? json.last_sync_time
            : null
        )
      } catch {
        setRemoteSyncTime(null)
      }
    }, [db, activeUser, syncServerUrl])

  useEffect(() => {
    if (!db) return

    refreshSyncStatus()
    refreshSyncIndicators()
  }, [
    db,
    refreshSyncStatus,
    refreshSyncIndicators,
    practice.result,
    selectedTopicId,
    activeUser
  ])

  const overallStatus =
    syncInfo?.overall ?? {
      status: "unknown",
      message: null,
      timestamp: null
    }
  const latestLocalSyncAt =
    overallStatus.timestamp ?? 0
  const localDirty =
    syncDirtyAt != null &&
    syncDirtyAt > latestLocalSyncAt
  const remoteDirty =
    remoteSyncTime != null &&
    remoteSyncTime > latestLocalSyncAt
  const syncNeedsAttention =
    localDirty || remoteDirty
  const syncTone =
    overallStatus.status === "failed"
      ? "#ef4444"
      : syncNeedsAttention
      ? "#f59e0b"
      : overallStatus.status === "success"
      ? "#22c55e"
      : colors.border

  async function syncToMaster() {

    if (!db || !activeUser) return

    if (!syncServerUrl) {
      Alert.alert(
        "Sync unavailable",
        "Global sync is not configured yet on this device."
      )
      return
    }

    setSyncing(true)

    try {
      await syncReviews(
        db,
        syncServerUrl,
        activeUser,
        {
          overlayLabel: "Syncing current profile..."
        }
      )
      await refreshSyncStatus()
      await refreshSyncIndicators()
      Alert.alert(
        "Sync complete",
        "Practice progress has been synced to the master DB."
      )
    } catch (error) {
      Alert.alert(
        "Sync failed",
        error instanceof Error
          ? error.message
          : "Unable to sync right now."
      )
    } finally {
      setSyncing(false)
    }

  }

  const loadPracticeAccuracy =
    useCallback(async () => {
      if (!db || !activeUser) {
        setPracticeAccuracy(0)
        setPracticeTotals({
          attempts: 0,
          correct: 0
        })
        return
      }

      const statsRepo =
        new StatsRepository(db)
      const totals =
        await statsRepo.getAccuracyTotals(
          activeUser,
          selectedTopicId
        )

      setPracticeTotals(totals)
      setPracticeAccuracy(
        totals.attempts === 0
          ? 0
          : Math.round(
              (totals.correct / totals.attempts) * 100
            )
      )

      console.log("[practice-accuracy] refreshed", {
        userId: activeUser,
        selectedTopicId,
        attempts: totals.attempts,
        correct: totals.correct,
        accuracy:
          totals.attempts === 0
            ? 0
            : Math.round(
                (totals.correct / totals.attempts) *
                  100
              )
      })
    }, [db, activeUser, selectedTopicId])

  useFocusEffect(
    useCallback(() => {
      loadPracticeAccuracy()
    }, [loadPracticeAccuracy])
  )

  useEffect(() => {
    loadPracticeAccuracy()
  }, [practice.result, loadPracticeAccuracy])

  useEffect(() => {

    if (
      !ttsEnabled ||
      !practiceQuestion
    ) {
      return
    }

    ttsService.speak(
      practiceQuestion.question
    )

  }, [ttsEnabled, practiceQuestion])

  useEffect(() => {

    if (
      !autoNextEnabled ||
      !practiceResult
    ) {
      return
    }

    const delaySeconds =
      practiceResult.correct
        ? autoNextCorrectDelaySeconds
        : autoNextWrongDelaySeconds

    autoNextQuestion(delaySeconds * 1000)

  }, [
    autoNextEnabled,
    autoNextCorrectDelaySeconds,
    autoNextWrongDelaySeconds,
    autoNextQuestion,
    practiceResult
  ])

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
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background }
        ]}
      >
        <Text
          style={[
            styles.loadingText,
            { color: colors.text }
          ]}
        >
          Choose a topic in the Topics tab first.
        </Text>
      </SafeAreaView>
    )
  }

  if (!practiceQuestion && practice.loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Preparing questions...
        </Text>
      </SafeAreaView>
    )
  }

  function replayQuestion() {

    if (!practiceQuestion) return

    ttsService.speak(practiceQuestion.question)

  }

  function renderQuestion() {

    if (!practiceQuestion) {
      return (
        <View style={styles.emptyCard}>
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.text }
            ]}
          >
            No question ready yet
          </Text>

          <Text
            style={[
              styles.emptyText,
              { color: colors.muted }
            ]}
          >
            This topic has no playable content yet.
          </Text>

          <Pressable
            style={[
              styles.retryButton,
              {
                backgroundColor: colors.iconActive
              }
            ]}
            onPress={practice.startPractice}
          >
            <Text
              style={[
                styles.retryButtonText,
                { color: "#ffffff" }
              ]}
            >
              Try Again
            </Text>
          </Pressable>
        </View>
      )
    }

    return (
      <Text
        style={[styles.question, { color: colors.text }]}
      >
        {practiceQuestion.question}
      </Text>
    )

  }

  function renderResult() {

    if (!practiceResult) return null

    if (practiceResult.correct) {
      return (
        <Text
          style={[
            styles.correct,
            { color: colors.iconActive }
          ]}
        >
          Correct answer. Great job.
        </Text>
      )
    }

    return (
      <Text
        style={[
          styles.wrong,
          { color: "#f87171" }
        ]}
      >
        Try again next time. Correct answer:{" "}
        {practiceResult.correctAnswer}
      </Text>
    )

  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background }
      ]}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background }
        ]}
      >
        <View
          style={[
            styles.headerCard,
            { backgroundColor: colors.card }
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text
                style={[
                  styles.screenMode,
                  { color: colors.iconActive }
                ]}
              >
                Practice Mode
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                style={[
                  styles.iconButton,
                  iconButtonStyle(practiceRandomOrderEnabled)
                ]}
                onPress={() =>
                  setPracticeRandomOrderEnabled(
                    !practiceRandomOrderEnabled
                  )
                }
              >
                <MaterialIcons
                  name="shuffle"
                  size={20}
                  color="#ffffff"
                />
              </Pressable>

              <Pressable
                style={[
                  styles.iconButton,
                  iconButtonStyle(autoNextEnabled)
                ]}
                onPress={() =>
                  setAutoNextEnabled(!autoNextEnabled)
                }
              >
                <MaterialIcons
                  name="skip-next"
                  size={20}
                  color="#ffffff"
                />
              </Pressable>

              <Pressable
                style={[
                  styles.iconButton,
                  iconButtonStyle(ttsEnabled)
                ]}
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
              style={[
                styles.iconButton,
                iconButtonStyle(false)
              ]}
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

          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.topicTitle,
              { color: colors.text }
            ]}
          >
            {selectedTopic?.name ??
              "Selected topic"}
          </Text>

            <ScoreHeader
              attempts={practiceTotals.attempts}
              correct={practiceTotals.correct}
              accuracy={practiceAccuracy}
            containerStyle={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border
            }}
            labelStyle={{ color: colors.muted }}
            valueStyle={{ color: colors.text }}
          />

          <Text
            style={[
              styles.scoreText,
              { color: colors.text }
            ]}
          >
            Session score: {practice.score}
          </Text>
        </View>

        <View
          style={[
            styles.questionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border
            }
          ]}
        >
          {renderQuestion()}

          {practiceQuestion ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  practiceAnswered &&
                    styles.inputDisabled,
                  {
                    borderColor: colors.border,
                    backgroundColor: practiceAnswered
                      ? colors.surface
                      : colors.background,
                    color: colors.text
                  }
                ]}
                value={practice.answer}
                onChangeText={practice.setAnswer}
                keyboardType={getKeyboardType(
                  practiceQuestion.answer
                )}
                autoCapitalize="none"
                returnKeyType="done"
                editable={!practiceAnswered}
                onSubmitEditing={() =>
                  practice.submitAnswer("good")
                }
                placeholder="Type your answer"
                placeholderTextColor={
                  colors.muted
                }
              />

              {renderResult()}
            </>
          ) : null}
        </View>

        {practiceQuestion ? (
          <View
            style={[
              styles.actionsCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border
              }
            ]}
          >
            <AnswerActions
              answered={practiceAnswered}
              onSubmit={() =>
                practice.submitAnswer("good")
              }
              onNext={() =>
                practice.nextQuestion()
              }
              onSync={syncToMaster}
              syncTone={syncTone}
              syncNeedsAttention={syncNeedsAttention}
              syncing={syncing}
              colors={colors}
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
    padding: 22
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

  headerActions: {
    flexDirection: "row",
    gap: 8
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },

  screenMode: {
    fontWeight: "800",
    textTransform: "uppercase"
  },

  topicTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    color: "#1e3a5f",
    marginTop: 8
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

  inputDisabled: {
    backgroundColor: "#e2e8f0",
    color: "#64748b"
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
