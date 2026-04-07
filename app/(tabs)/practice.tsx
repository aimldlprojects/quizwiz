import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native"
import { useIsFocused } from "@react-navigation/native"
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
import {
  getTableDeck,
  isTableTopicKey,
  TableDeckSession
} from "../../engine/questions/tableDeck"
import {
  buildReviewPriorityStages,
  ReviewPriorityReviewSnapshot
} from "../../engine/questions/reviewPriority"
import {
  getSyncDirtyAt,
  getSyncMeta,
  subscribeSyncMetaChanges
} from "../../database/syncMetaRepository"
import { ReviewScheduler } from "../../engine/scheduler/reviewScheduler"
import { useDatabase } from "../../hooks/useDatabase"
import { useDeviceRegistry } from "../../hooks/useDeviceRegistry"
import { usePractice } from "../../hooks/usePractice"
import { useSettings } from "../../hooks/useSettings"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"
import { useUsers } from "../../hooks/useUsers"
import { ttsService } from "../../services/ttsService"
import { getThemeColors } from "../../styles/theme"
import { restartButtonPadding } from "../../styles/restartButtonStyles"

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
  const isFocused = useIsFocused()

  const { db, loading } = useDatabase()
  const {
    activeUser,
    loading: usersLoading
  } = useUsers(db)
  const {
    activeDeviceKey,
    loading: deviceLoading
  } = useDeviceRegistry(db, activeUser)
  const {
    syncMode,
    loading: settingsLoading
  } = useSettings(db, activeUser)
  const scopedDeviceKey =
    syncMode === "global_off"
      ? activeDeviceKey
      : null
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
    activeUser,
    scopedDeviceKey
  )

  const [selectedTopic, setSelectedTopic] =
    useState<TopicRecord | null>(null)
  const [practiceDeckTotal, setPracticeDeckTotal] =
    useState(0)
  const priorityStagesRef = useRef<
    Array<{
      key: string
      label: string
      cards: Array<{
        id: number
        question: string
        answer: string | number
        type?: string
      }>
    }>
  >([])
  const priorityStageIndexRef = useRef(0)
  const priorityStageCursorRef = useRef(0)
  const prioritySessionKeyRef = useRef("")
  const [priorityStageLabel, setPriorityStageLabel] =
    useState<string | null>(null)
  const tableDeckSessionRef =
    useRef(new TableDeckSession())
  const lastAppliedSyncTimestampRef =
    useRef(0)

  const isTableTopic = Boolean(
    selectedTopic?.key &&
      [
        "multiplication_tables",
        "tables_1_5",
        "tables_6_10",
        "tables_11_15",
        "tables_16_20"
      ].includes(selectedTopic.key)
  )

  const getPracticeTopicIds = useCallback(
    async () => {
      if (!db || !selectedTopicId) {
        return []
      }

      const topics = await getAllTopics(db)
      return getDescendantTopicIds(
        topics,
        selectedTopicId
      )
    },
    [db, selectedTopicId]
  )

  const resetPrioritySession =
    useCallback(() => {
      priorityStagesRef.current = []
      priorityStageIndexRef.current = 0
      priorityStageCursorRef.current = 0
      prioritySessionKeyRef.current = ""
      setPriorityStageLabel(null)
    }, [])

  useEffect(() => {
    resetPrioritySession()
  }, [
    activeUser,
    selectedTopicId,
    practiceRandomOrderEnabled,
    resetPrioritySession
  ])

  useEffect(() => {

    async function loadTopic() {

      if (!db || !selectedTopicId) {
        setSelectedTopic(null)
        setPracticeDeckTotal(0)
        return
      }

      const topic =
        await getTopicById(
          db,
          selectedTopicId
      )

      setSelectedTopic(topic ?? null)

      if (!topic) {
        setPracticeDeckTotal(0)
        return
      }

      if (isTableTopicKey(topic.key ?? "")) {
        setPracticeDeckTotal(
          getTableDeck(topic.key ?? "").length
        )
        return
      }

      const topics = await getAllTopics(db)
      const topicIds = getDescendantTopicIds(
        topics,
        selectedTopicId
      )

      const rows = await getQuestionsForTopicTree(
        db,
        topicIds,
        undefined,
        "sequence"
      )

      setPracticeDeckTotal(rows.length)

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
          const topicKey = topic?.key ?? ""
          const sessionKey = [
            activeUser,
            selectedTopicId,
            topicKey,
            practiceRandomOrderEnabled
              ? "random_on"
              : "random_off"
          ].join(":")

          if (
            prioritySessionKeyRef.current !==
            sessionKey
          ) {
            let allCards: Array<{
              id: number
              question: string
              answer: string | number
              type?: string
            }> = []

            if (isTableTopicKey(topicKey)) {
              allCards = getTableDeck(topicKey)
            } else {
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
                  undefined,
                  "sequence"
                )

              allCards = rows.map((row) => ({
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

            const reviews =
              allCards.length === 0
                ? []
                : await db.getAllAsync<ReviewPriorityReviewSnapshot>(
                    `
                    SELECT
                      question_id,
                      repetition,
                      next_review,
                      last_result
                    FROM reviews
                    WHERE user_id = ?
                      AND question_id IN (${allCards
                        .map(() => "?")
                        .join(", ")})
                    `,
                    [
                      activeUser,
                      ...allCards.map((card) => card.id)
                    ]
                  )

            const stages =
              buildReviewPriorityStages(
                allCards,
                reviews,
                {
                  shuffleWithinStage:
                    practiceRandomOrderEnabled
                }
              ).filter(
                (stage) => stage.cards.length > 0
              )

            priorityStagesRef.current = stages
            priorityStageIndexRef.current = 0
            priorityStageCursorRef.current = 0
            prioritySessionKeyRef.current =
              sessionKey
            setPriorityStageLabel(
              stages[0]?.label ?? null
            )
          }

          const stage =
            priorityStagesRef.current[
              priorityStageIndexRef.current
            ]

          if (!stage) {
            return []
          }

          const start =
            priorityStageCursorRef.current
          const sliced = stage.cards.slice(
            start,
            start + limit
          )
          priorityStageCursorRef.current +=
            sliced.length
          return sliced
        }
      },
      10,
      undefined,
      undefined,
      true,
      practiceRandomOrderEnabled,
      getPracticeTopicIds
    )

    return new PracticeController(
      activeUser,
      scheduler,
      queue,
      repo,
      selectedTopicId,
      scopedDeviceKey,
      practiceRandomOrderEnabled
    )

  }, [
    db,
    activeUser,
    selectedTopicId,
    scopedDeviceKey,
    practiceRandomOrderEnabled,
    getPracticeTopicIds
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
  const practiceRemainingCards =
    practice.remainingCards
  const practiceAccuracy =
    practice.accuracy
  const colors = getThemeColors(themeMode)
  const iconButtonStyle = (active: boolean) => ({
    backgroundColor: active
      ? colors.iconActive
      : colors.iconInactive
  })

  const handlePracticeMore = useCallback(async () => {
    const currentStage =
      priorityStagesRef.current[
        priorityStageIndexRef.current
      ]
    const nextStage =
      priorityStagesRef.current[
        priorityStageIndexRef.current + 1
      ]
    const currentStageDone =
      currentStage != null &&
      priorityStageCursorRef.current >=
        currentStage.cards.length

    if (currentStageDone && nextStage) {
      priorityStageIndexRef.current += 1
      priorityStageCursorRef.current = 0
      setPriorityStageLabel(nextStage.label)
      await practice.startPractice()
      return
    }

    resetPrioritySession()

    if (isTableTopic) {
      tableDeckSessionRef.current.reset()
    }

    await practice.restartPractice()
  }, [
    isTableTopic,
    practice,
    resetPrioritySession
  ])

  const togglePracticeRandomOrder =
    useCallback(() => {
      const nextEnabled =
        !practiceRandomOrderEnabled

      console.log("[Practice] shuffle toggle:", {
        userId: activeUser,
        topicId: selectedTopicId,
        nextEnabled
      })

      setPracticeRandomOrderEnabled(nextEnabled)

      if (!nextEnabled || !controller) {
        return
      }

      controller.shuffleRemainingCards()
    }, [
      controller,
      activeUser,
      practiceRandomOrderEnabled,
      selectedTopicId,
      setPracticeRandomOrderEnabled
    ])

  const toggleAutoNextEnabled =
    useCallback(() => {
      const nextEnabled = !autoNextEnabled

      console.log("[Practice] autoplay toggle:", {
        userId: activeUser,
        topicId: selectedTopicId,
        nextEnabled
      })

      setAutoNextEnabled(nextEnabled)
    }, [activeUser, autoNextEnabled, selectedTopicId, setAutoNextEnabled])

  const toggleTtsEnabled = useCallback(() => {
    const nextEnabled = !ttsEnabled

    console.log("[Practice] tts toggle:", {
      userId: activeUser,
      topicId: selectedTopicId,
      nextEnabled
    })

    setTtsEnabled(nextEnabled)
  }, [activeUser, selectedTopicId, setTtsEnabled, ttsEnabled])

  useEffect(() => {

    if (
      !isFocused ||
      !ttsEnabled ||
      !practiceQuestion
    ) {
      return
    }

    ttsService.speak(
      practiceQuestion.question
    )

  }, [isFocused, ttsEnabled, practiceQuestion])

  useEffect(() => {

    if (
      !isFocused ||
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
    isFocused,
    practiceResult
  ])

  useEffect(() => {
    if (isFocused) {
      return
    }

    practice.cancelAutoNext()
    ttsService.stop()
  }, [isFocused, practice])

  useEffect(() => {
    if (
      !db ||
      !activeUser ||
      !selectedTopicId
    ) {
      return
    }

    let cancelled = false

    const reloadFromSyncedSession = async () => {
      if (practiceQuestion) {
        return
      }

      const [meta, dirtyAt] = await Promise.all([
        getSyncMeta(db, activeUser),
        getSyncDirtyAt(db, activeUser)
      ])

      if (cancelled) {
        return
      }

      if (dirtyAt > 0) {
        return
      }

      if (meta.lastStatus !== "success") {
        return
      }

      if (
        meta.lastTimestamp <= 0 ||
        meta.lastTimestamp ===
          lastAppliedSyncTimestampRef.current
      ) {
        return
      }

      lastAppliedSyncTimestampRef.current =
        meta.lastTimestamp
      await practice.startPractice()
    }

    const unsubscribe = subscribeSyncMetaChanges(() => {
      void reloadFromSyncedSession()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [
    activeUser,
    db,
    practice,
    practiceQuestion,
    selectedTopicId
  ])

  if (
    loading ||
    usersLoading ||
    settingsLoading ||
    preferencesLoading ||
    deviceLoading ||
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

    if (!isFocused || !practiceQuestion) return

    ttsService.speak(practiceQuestion.question)

  }

  function renderQuestion() {
    const currentStage =
      priorityStagesRef.current[
        priorityStageIndexRef.current
      ]
    const nextStage =
      priorityStagesRef.current[
        priorityStageIndexRef.current + 1
      ]
    const currentStageDone =
      currentStage != null &&
      priorityStageCursorRef.current >=
        currentStage.cards.length

    if (!practiceQuestion) {
      if (currentStageDone && currentStage) {
        return (
          <View style={styles.emptyCard}>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text }
              ]}
            >
              {currentStage.label} completed
            </Text>

            <Text
              style={[
                styles.emptyText,
                { color: colors.muted }
              ]}
            >
              {nextStage
                ? `Continue to ${nextStage.label}.`
                : "All priority stages completed for this topic."}
            </Text>

            <Pressable
              style={[
                styles.restartButton,
                {
                  backgroundColor: colors.iconActive,
                  ...restartButtonPadding
                }
              ]}
              onPress={handlePracticeMore}
            >
              <Text
                style={[
                  styles.restartButtonText,
                  { color: "#ffffff" }
                ]}
              >
                {nextStage
                  ? `Practice next: ${nextStage.label}`
                  : "Practice more"}
              </Text>
            </Pressable>
          </View>
        )
      }

      if (isTableTopic && practiceRemainingCards === 0) {
        return (
          <View style={styles.emptyCard}>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text }
              ]}
            >
              Topic complete
            </Text>

            <Text
              style={[
                styles.emptyText,
                { color: colors.muted }
              ]}
            >
              You have reached the end of this practice session.
            </Text>

            <Pressable
              style={[
                styles.restartButton,
                {
                  backgroundColor: colors.iconActive,
                  ...restartButtonPadding
                }
              ]}
              onPress={handlePracticeMore}
            >
              <Text
                style={[
                  styles.restartButtonText,
                  { color: "#ffffff" }
                ]}
              >
                Practice more
              </Text>
            </Pressable>
          </View>
        )
      }

      if (selectedTopicId && practice.stats.attempts > 0) {
        return (
          <View style={styles.emptyCard}>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text }
              ]}
            >
              Topic complete
            </Text>

            <Text
              style={[
                styles.emptyText,
                { color: colors.muted }
              ]}
            >
              You have reached the end of this practice session.
            </Text>

            <Pressable
              style={[
                styles.restartButton,
                {
                  backgroundColor: colors.iconActive,
                  ...restartButtonPadding
                }
              ]}
              onPress={handlePracticeMore}
            >
              <Text
                style={[
                  styles.restartButtonText,
                  { color: "#ffffff" }
                ]}
              >
                Practice more
              </Text>
            </Pressable>
          </View>
        )
      }

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
                styles.restartButton,
                {
                  backgroundColor: colors.iconActive,
                  ...restartButtonPadding
                }
              ]}
              onPress={practice.startPractice}
            >
              <Text
                style={[
                  styles.restartButtonText,
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

  function renderQuestionProgress() {

    if (!practiceQuestion) return null

    const currentQuestionNumber =
      practiceAnswered
        ? practice.stats.attempts
        : practice.stats.attempts + 1

    const totalQuestions = practiceDeckTotal

    if (totalQuestions <= 0) return null

    return (
      <Text
        style={[
          styles.questionProgress,
          { color: colors.muted }
        ]}
      >
        Card {currentQuestionNumber} of{" "}
        {totalQuestions}
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
                onPress={togglePracticeRandomOrder}
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
                onPress={toggleAutoNextEnabled}
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
                onPress={toggleTtsEnabled}
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

          {priorityStageLabel ? (
            <Text
              style={[
                styles.stageText,
                { color: colors.muted }
              ]}
            >
              Priority stage: {priorityStageLabel}
            </Text>
          ) : null}

          <ScoreHeader
            attempts={practice.stats.attempts}
            correct={practice.stats.correct}
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
          {renderQuestionProgress()}
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
    padding: 12
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
    padding: 14
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
    marginTop: 4
  },

  scoreText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a5f"
  },

  stageText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600"
  },

  questionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 16,
    marginTop: 14
  },

  question: {
    fontSize: 34,
    textAlign: "center",
    marginBottom: 24,
    color: "#1e3a5f",
    fontWeight: "800"
  },

  questionProgress: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16
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
    marginTop: 14,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 14
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

  restartButton: {
    borderRadius: 18,
    alignItems: "center"
  },

  restartButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  }

})
