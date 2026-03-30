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
  generateQuestionBatch
} from "../../engine/questions/questionFactory"
import {
  getTableDeck,
  isTableTopicKey,
  TableDeckSession
} from "../../engine/questions/tableDeck"
import { ReviewScheduler } from "../../engine/scheduler/reviewScheduler"
import { useDatabase } from "../../hooks/useDatabase"
import { usePractice } from "../../hooks/usePractice"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"
import { useUsers } from "../../hooks/useUsers"
import { ttsService } from "../../services/ttsService"
import { getThemeColors } from "../../styles/theme"
import { restartButtonPadding } from "../../styles/restartButtonStyles"
import { shuffleArray } from "../../engine/questions/shuffle"

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
  const [practiceDeckTotal, setPracticeDeckTotal] =
    useState(0)
  const tableDeckSessionRef =
    useRef(new TableDeckSession())

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

          if (isTableTopicKey(topicKey)) {
            tableDeckSessionRef.current.load(topicKey)
            const tableCards =
              tableDeckSessionRef.current.take(limit)

            return practiceRandomOrderEnabled
              ? shuffleArray(tableCards)
              : tableCards
          }

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

            return practiceRandomOrderEnabled
              ? shuffleArray(mappedRows)
              : mappedRows
          }

          if (topicKey) {
            const generated =
              generateQuestionBatch(
                topicKey,
                limit
              )

            if (generated.length > 0) {
              return practiceRandomOrderEnabled
                ? shuffleArray(generated)
                : generated
            }
          }

          return []
        }
      },
      10,
      practiceRandomOrderEnabled
        ? repo
        : undefined,
      practiceRandomOrderEnabled
        ? activeUser
        : undefined,
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
      practiceRandomOrderEnabled
    )

  }, [
    db,
    activeUser,
    selectedTopicId,
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
    if (isTableTopic) {
      tableDeckSessionRef.current.reset()
    }

    await practice.restartPractice()
  }, [isTableTopic, practice])

  const togglePracticeRandomOrder =
    useCallback(() => {
      const nextEnabled =
        !practiceRandomOrderEnabled

      setPracticeRandomOrderEnabled(nextEnabled)

      if (!nextEnabled || !controller) {
        return
      }

      controller.shuffleRemainingCards()
    }, [
      controller,
      practiceRandomOrderEnabled,
      setPracticeRandomOrderEnabled
    ])

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
          {renderQuestion()}
          {renderQuestionProgress()}

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
