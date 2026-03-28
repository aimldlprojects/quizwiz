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
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import FlashCard from "../../components/FlashCard"
import {
  LearnController,
  LearnFeedback
} from "../../controllers/learnController"
import {
  getAllTopics,
  getDescendantTopicIds,
  getQuestionsForTopicTree,
  getTopicById,
  TopicRecord
} from "../../database/contentRepository"
import {
  getLearnProgress,
  setLearnProgress
} from "../../database/learnProgressRepository"
import { generateLearnCardsForTopic } from "../../engine/questions/questionFactory"
import { useDatabase } from "../../hooks/useDatabase"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"
import { useUsers } from "../../hooks/useUsers"
import { getThemeColors } from "../../styles/theme"

type Card = {
  id: number
  question: string
  answer: string | number
}

function getTopicDescription(
  topic: TopicRecord | null
) {

  if (!topic) {
    return "Open the Topics tab and choose what to study."
  }

  switch (topic.key) {
    case "multiplication_tables":
    case "tables_1_5":
    case "tables_6_10":
    case "tables_11_15":
    case "tables_16_20":
      return "Swipe through generated table cards and replay them with audio."
    default:
      return "Flip through the cards in the selected topic."
  }

}

export default function LearnScreen() {

  const controller = useMemo(
    () => new LearnController(),
    []
  )

  const { db, loading } = useDatabase()
  const {
    activeUser,
    loading: usersLoading
  } = useUsers(db)
  const {
    selectedTopicId,
    ttsEnabled,
    setTtsEnabled,
    learnAutoPlayEnabled,
    setLearnAutoPlayEnabled,
    learnFrontDelaySeconds,
    learnBackDelaySeconds,
    learnRandomOrderEnabled,
    setLearnRandomOrderEnabled,
    themeMode,
    loading: preferencesLoading
  } = useStudyPreferences(
    db,
    activeUser
  )

  const [card, setCard] =
    useState<Card | null>(null)
  const [revealed, setRevealed] =
    useState(false)
  const [topic, setTopic] =
    useState<TopicRecord | null>(null)
  const [progress, setProgress] = useState({
    current: 0,
    total: 0
  })
  const autoFlipTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    )
  const autoNextTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    )
  const colors = getThemeColors(themeMode)
  const iconButtonStyle = (active: boolean) => ({
    backgroundColor: active
      ? colors.iconActive
      : colors.iconInactive
  })

  const persistLearnProgress =
    useCallback(async () => {
      if (!db || !activeUser || !selectedTopicId) {
        return
      }

      const currentCard =
        controller.getCurrentCard()
      const progressSnapshot =
        controller.getProgress()

      if (!currentCard || progressSnapshot.total === 0) {
        return
      }

      await setLearnProgress(
        db,
        activeUser,
        {
          topicId: selectedTopicId,
          cardId: currentCard.id,
          cardIndex: Math.max(
            0,
            progressSnapshot.current - 1
          ),
          totalCards: progressSnapshot.total
        }
      )
    }, [db, activeUser, selectedTopicId, controller])

  function clearLearnTimers() {

    if (autoFlipTimeoutRef.current) {
      clearTimeout(autoFlipTimeoutRef.current)
      autoFlipTimeoutRef.current = null
    }

    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current)
      autoNextTimeoutRef.current = null
    }

  }

  const nextCard = useCallback(() => {

    clearLearnTimers()

    const next =
      controller.next() as Card | null

    setCard(next)
    setRevealed(false)
    setProgress(controller.getProgress())
    void persistLearnProgress()

  }, [controller, persistLearnProgress])

  const prevCard = useCallback(() => {

    clearLearnTimers()

    const previous =
      controller.previous() as Card | null

    setCard(previous)
    setRevealed(false)
    setProgress(controller.getProgress())
    void persistLearnProgress()

  }, [controller, persistLearnProgress])

  const rateCard = useCallback((
    feedback: LearnFeedback
  ) => {

    clearLearnTimers()

    const next = learnRandomOrderEnabled
      ? (controller.rateCurrentCard(
          feedback
        ) as Card | null)
      : (controller.next() as Card | null)

    setCard(next)
    setRevealed(false)
    setProgress(controller.getProgress())
    void persistLearnProgress()

  }, [
    controller,
    learnRandomOrderEnabled,
    persistLearnProgress
  ])

  const speakCurrentSide = useCallback(() => {
    if (!ttsEnabled || !card) {
      return
    }

    const spokenText = revealed
      ? String(card.answer)
      : card.question

    controller.speak(spokenText)
  }, [ttsEnabled, card, revealed, controller])

  useEffect(() => {

    let cancelled = false

    async function loadCards() {

      if (!db || !activeUser || !selectedTopicId) {
        controller.reset()
        setCard(null)
        setRevealed(false)
        setTopic(null)
        setProgress({
          current: 0,
          total: 0
        })
        return
      }

      const selectedTopic =
        await getTopicById(
          db,
          selectedTopicId
        )

      if (cancelled) {
        return
      }

      const topics =
        await getAllTopics(db)

      if (cancelled) {
        return
      }

      setTopic(selectedTopic ?? null)

      const topicKey =
        selectedTopic?.key ?? ""

      const generatedCards =
        generateLearnCardsForTopic(topicKey)

      if (generatedCards.length > 0) {
        controller.loadCards(generatedCards)
        const savedProgress =
          await getLearnProgress(
            db,
            activeUser,
            selectedTopicId
          )

        if (cancelled) {
          return
        }

        if (savedProgress) {
          const restoredIndex =
            savedProgress.cardId != null
              ? generatedCards.findIndex(
                  (generatedCard) =>
                    generatedCard.id ===
                    savedProgress.cardId
                )
              : -1

          controller.setCurrentIndex(
            restoredIndex >= 0
              ? restoredIndex
              : savedProgress.cardIndex
          )
        }

        setCard(controller.getCurrentCard())
        setRevealed(false)
        setProgress(controller.getProgress())
        void persistLearnProgress()
        return
      }

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

      if (cancelled) {
        return
      }

      if (rows.length === 0) {
        controller.reset()
        setCard(null)
        setRevealed(false)
        setProgress({
          current: 0,
          total: 0
        })
        return
      }

      const loadedCards = rows.map((row) => ({
        id: row.id,
        question: row.question,
        answer: Number.isNaN(
          Number(row.answer)
        )
          ? row.answer
          : Number(row.answer)
      }))

      controller.loadCards(loadedCards)

      const savedProgress =
        await getLearnProgress(
          db,
          activeUser,
          selectedTopicId
        )

      if (cancelled) {
        return
      }

      if (savedProgress) {
        const restoredIndex =
          savedProgress.cardId != null
            ? loadedCards.findIndex(
                (loadedCard) =>
                  loadedCard.id ===
                  savedProgress.cardId
              )
            : -1

        controller.setCurrentIndex(
          restoredIndex >= 0
            ? restoredIndex
            : savedProgress.cardIndex
        )
      }

      setCard(controller.getCurrentCard())
      setRevealed(false)
      setProgress(controller.getProgress())
      void persistLearnProgress()

    }

    loadCards()

    return () => {
      cancelled = true
    }

  }, [
    db,
    selectedTopicId,
    controller,
    activeUser,
    persistLearnProgress
  ])

  useEffect(() => {
    return () => {
      void persistLearnProgress()
      clearLearnTimers()
    }
  }, [selectedTopicId, persistLearnProgress])

  useEffect(() => {

    speakCurrentSide()

  }, [speakCurrentSide])

  useEffect(() => {

    clearLearnTimers()

    if (
      !learnAutoPlayEnabled ||
      !card
    ) {
      return
    }

    setRevealed(false)

    autoFlipTimeoutRef.current = setTimeout(() => {
      setRevealed(true)

      autoNextTimeoutRef.current = setTimeout(() => {
        nextCard()
      }, learnBackDelaySeconds * 1000)
    }, learnFrontDelaySeconds * 1000)

    return () => {
      clearLearnTimers()
    }

  }, [
    card,
    learnAutoPlayEnabled,
    learnFrontDelaySeconds,
    learnBackDelaySeconds,
    nextCard
  ])

  useEffect(() => () => {
    clearLearnTimers()
  }, [])

  function replayQuestion() {

    if (!card) return

    speakCurrentSide()

  }

  if (
    loading ||
    usersLoading ||
    preferencesLoading ||
    !db
  ) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading learn mode...
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background }
      ]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.hero,
            { backgroundColor: colors.card }
          ]}
        >
            <View
              style={[
                styles.heroHeader,
                { borderColor: colors.border }
              ]}
            >
              <View style={styles.heroCopy}>
                <Text
                  style={[
                    styles.kicker,
                    { color: colors.iconActive }
                  ]}
                >
                  Learn mode
                </Text>
              </View>

              <View style={styles.headerActions}>
              <Pressable
                style={[
                  styles.iconButton,
                  iconButtonStyle(learnRandomOrderEnabled)
                ]}
                onPress={() =>
                  setLearnRandomOrderEnabled(
                    !learnRandomOrderEnabled
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
                  iconButtonStyle(learnAutoPlayEnabled)
                ]}
                onPress={() =>
                  setLearnAutoPlayEnabled(
                    !learnAutoPlayEnabled
                  )
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
              {topic?.name ??
                "Choose a topic first"}
            </Text>

            <Text
              style={[styles.subtitle, { color: colors.muted }]}
            >
              {getTopicDescription(topic)}
          </Text>
        </View>

            <View
              style={[
                styles.cardShell,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border
                }
              ]}
            >
              {card ? (
                <FlashCard
                  question={card.question}
                  answer={String(card.answer)}
                  revealed={revealed}
                  onToggle={setRevealed}
                  colors={colors}
                />
          ) : (
            <Text
              style={[styles.placeholder, { color: colors.muted }]}
            >
              {selectedTopicId
                ? "No cards are ready for this topic yet."
                : "Choose a topic before learning."}
            </Text>
          )}
        </View>

        {card ? (
          <>
            <View style={styles.controls}>
              <Pressable
                style={[
                  styles.controlButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1
                  }
                ]}
                onPress={prevCard}
              >
                <Text
                  style={[
                    styles.controlText,
                    { color: colors.text }
                  ]}
                >
                  Previous
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.controlButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1
                  }
                ]}
                onPress={nextCard}
              >
                <Text
                  style={[
                    styles.controlText,
                    { color: colors.text }
                  ]}
                >
                  Next
                </Text>
              </Pressable>
            </View>

            <View style={styles.feedbackRow}>
              <Pressable
                style={[
                  styles.feedbackButton,
                  styles.feedbackEasiest
                ]}
                onPress={() =>
                  rateCard("very_easy")
                }
              >
                <Text style={styles.feedbackText}>
                  Very Easy
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.feedbackButton,
                  styles.feedbackEasy
                ]}
                onPress={() => rateCard("easy")}
              >
                <Text style={styles.feedbackText}>
                  Easy
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.feedbackButton,
                  styles.feedbackHard
                ]}
                onPress={() => rateCard("hard")}
              >
                <Text style={styles.feedbackText}>
                  Hard
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.feedbackButton,
                  styles.feedbackHardest
                ]}
                onPress={() =>
                  rateCard("very_hard")
                }
              >
                <Text style={styles.feedbackText}>
                  Very Hard
                </Text>
              </Pressable>
            </View>

            <Text
              style={[
                styles.progress,
                { color: colors.text }
              ]}
            >
              Card {progress.current} of{" "}
              {progress.total}
            </Text>
          </>
        ) : null}
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
    flex: 1
  },

  content: {
    padding: 20,
    paddingBottom: 32
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

  hero: {
    backgroundColor: "#dcfce7",
    borderRadius: 26,
    padding: 22
  },

  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },

  heroCopy: {
    flex: 1
  },

  headerActions: {
    flexDirection: "row",
    gap: 8
  },

  kicker: {
    color: "#15803d",
    fontWeight: "800",
    textTransform: "uppercase"
  },

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#1e3a5f",
    marginTop: 8
  },

  topicTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "800",
    marginTop: 8
  },

  subtitle: {
    fontSize: 16,
    color: "#475569",
    marginTop: 8,
    lineHeight: 22
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },

  cardShell: {
    marginTop: 24,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 16,
    minHeight: 220,
    justifyContent: "center"
  },

  feedbackRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18
  },

  feedbackButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center"
  },

  feedbackHardest: {
    backgroundColor: "#ef4444"
  },

  feedbackHard: {
    backgroundColor: "#f97316"
  },

  feedbackEasy: {
    backgroundColor: "#22c55e"
  },

  feedbackEasiest: {
    backgroundColor: "#0ea5e9"
  },

  feedbackText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12
  },

  placeholder: {
    textAlign: "center",
    fontSize: 18,
    lineHeight: 26,
    color: "#64748b",
    paddingHorizontal: 16
  },

  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 20
  },

  controlButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center"
  },

  controlText: {
    color: "#0f172a",
    fontWeight: "700"
  },

  progress: {
    marginTop: 14,
    textAlign: "center",
    color: "#475569",
    fontSize: 16,
    fontWeight: "700"
  }

})
