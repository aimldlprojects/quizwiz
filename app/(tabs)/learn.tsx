import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native"
import { useIsFocused } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

import FlashCard from "../../components/FlashCard"
import {
  LearnController,
  LearnFeedback
} from "../../controllers/learnController"
import {
  getAllTopics,
  getDescendantTopicIds,
  getQuestionCountForTopicTree,
  getQuestionsForTopicTree,
  getTopicById,
  TopicRecord
} from "../../database/contentRepository"
import {
  getLearnProgress,
  setLearnProgress
} from "../../database/learnProgressRepository"
import {
  getSyncDirtyAt,
  getSyncMeta,
  subscribeSyncMetaChanges
} from "../../database/syncMetaRepository"
import {
  getTableDeck,
  isTableTopicKey
} from "../../engine/questions/tableDeck"
import { useDatabase } from "../../hooks/useDatabase"
import { useDeviceRegistry } from "../../hooks/useDeviceRegistry"
import { useSettings } from "../../hooks/useSettings"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"
import { useUsers } from "../../hooks/useUsers"
import { ttsService } from "../../services/ttsService"
import { getThemeColors } from "../../styles/theme"
import { restartButtonPadding } from "../../styles/restartButtonStyles"

type Card = {
  id: number
  question: string
  answer: string | number
}

type ReviewSnapshot = {
  question_id: number
  repetition: number | null
  next_review: number | null
  last_result: string | null
}

const LEARN_DB_CHUNK_SIZE = 120

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
  const isFocused = useIsFocused()

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
    activeUser,
    scopedDeviceKey
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
  const completionAnim =
    useRef(new Animated.Value(0)).current
  const learnRandomOrderEnabledRef =
    useRef(learnRandomOrderEnabled)
  const lastAppliedSyncTimestampRef =
    useRef(0)
  const nonTableTopicIdsRef =
    useRef<number[]>([])
  const nonTableLoadedCardsRef =
    useRef<Card[]>([])
  const nonTableTotalCardsRef =
    useRef(0)
  const nonTableOffsetRef =
    useRef(0)
  const nonTableHasMoreRef =
    useRef(false)
  const nonTableLoadingMoreRef =
    useRef(false)
  const colors = getThemeColors(themeMode)
  const iconButtonStyle = (active: boolean) => ({
    backgroundColor: active
      ? colors.iconActive
      : colors.iconInactive
  })
  const isTableTopic = Boolean(
    isTableTopicKey(topic?.key)
  )

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
          totalCards: progressSnapshot.total,
          deviceKey: scopedDeviceKey
        }
      )
  }, [
    db,
    activeUser,
    selectedTopicId,
    scopedDeviceKey,
    controller
  ])

  useEffect(() => {
    learnRandomOrderEnabledRef.current =
      learnRandomOrderEnabled
  }, [learnRandomOrderEnabled])

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

  function mapRowsToCards(
    rows: Array<{
      id: number
      question: string
      answer: string
    }>
  ) {
    return rows.map((row) => ({
      id: row.id,
      question: row.question,
      answer: Number.isNaN(Number(row.answer))
        ? row.answer
        : Number(row.answer)
    }))
  }

  const applySmartLearnOrder = useCallback(async (
    cards: Card[]
  ) => {
    if (
      !db ||
      !activeUser ||
      cards.length === 0 ||
      isTableTopic ||
      learnRandomOrderEnabledRef.current
    ) {
      return cards
    }

    const placeholders = cards
      .map(() => "?")
      .join(", ")

    const rows = await db.getAllAsync<ReviewSnapshot>(
      `
      SELECT
        question_id,
        repetition,
        next_review,
        last_result
      FROM reviews
      WHERE user_id = ?
        AND question_id IN (${placeholders})
      `,
      [activeUser, ...cards.map((card) => card.id)]
    )

    const reviewByQuestionId = new Map(
      rows.map((row) => [row.question_id, row])
    )
    const now = Date.now()

    const rankedCards = cards.map((card, index) => {
      const review = reviewByQuestionId.get(card.id)
      const repetition = review?.repetition ?? 0
      const nextReview = review?.next_review ?? null
      const lastResult = review?.last_result ?? null
      const hasReview = !!review
      const isWeakOrDue =
        lastResult === "again" ||
        (typeof nextReview === "number" &&
          nextReview > 0 &&
          nextReview <= now)
      const isRecentlyMastered =
        repetition >= 2 &&
        typeof nextReview === "number" &&
        nextReview > now

      let rank = 2

      if (isWeakOrDue) {
        rank = 0
      } else if (!hasReview) {
        rank = 1
      } else if (isRecentlyMastered) {
        rank = 3
      }

      const dueOrder =
        typeof nextReview === "number"
          ? nextReview
          : Number.MAX_SAFE_INTEGER

      return {
        card,
        rank,
        dueOrder,
        index
      }
    })

    rankedCards.sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank
      }

      if (a.rank === 0 || a.rank === 3) {
        if (a.dueOrder !== b.dueOrder) {
          return a.dueOrder - b.dueOrder
        }
      }

      return a.index - b.index
    })

    return rankedCards.map((item) => item.card)
  }, [activeUser, db, isTableTopic])

  function updateCardAndProgress(
    nextCard: Card | null
  ) {
    setCard(nextCard)
    setRevealed(false)

    const snapshot = controller.getProgress()
    const displayTotal =
      !isTableTopic &&
      nonTableTotalCardsRef.current > 0
        ? nonTableTotalCardsRef.current
        : snapshot.total

    setProgress({
      current: Math.min(snapshot.current, displayTotal),
      total: displayTotal
    })
  }

  const loadNextNonTableChunk = useCallback(async () => {
    if (!db) {
      return false
    }

    if (nonTableLoadingMoreRef.current) {
      return false
    }

    if (!nonTableHasMoreRef.current) {
      return false
    }

    const topicIds = nonTableTopicIdsRef.current
    if (topicIds.length === 0) {
      return false
    }

    nonTableLoadingMoreRef.current = true

    try {
      const rows = await getQuestionsForTopicTree(
        db,
        topicIds,
        LEARN_DB_CHUNK_SIZE,
        "sequence",
        nonTableOffsetRef.current
      )

      if (rows.length === 0) {
        nonTableHasMoreRef.current = false
        return false
      }

      const currentCardId =
        controller.getCurrentCardId()
      const currentIndex =
        controller.getCurrentIndex()
      const appendedCards =
        mapRowsToCards(rows)
      const mergedCardsUnsorted = [
        ...nonTableLoadedCardsRef.current,
        ...appendedCards
      ]
      const mergedCards =
        await applySmartLearnOrder(
          mergedCardsUnsorted
        )

      nonTableLoadedCardsRef.current =
        mergedCards
      nonTableOffsetRef.current += rows.length
      nonTableHasMoreRef.current =
        nonTableOffsetRef.current <
        nonTableTotalCardsRef.current

      controller.loadCards(mergedCards)

      const restoredIndex =
        currentCardId != null
          ? mergedCards.findIndex(
              (card) => card.id === currentCardId
            )
          : -1

      controller.setCurrentIndex(
        restoredIndex >= 0
          ? restoredIndex
          : Math.max(
              0,
              Math.min(
                currentIndex,
                mergedCards.length - 1
              )
            )
      )

      if (learnRandomOrderEnabledRef.current) {
        controller.shuffleRemaining()
      }

      updateCardAndProgress(
        controller.getCurrentCard() as Card | null
      )

      return true
    } finally {
      nonTableLoadingMoreRef.current = false
    }
  }, [controller, db, isTableTopic])

  const nextCard = useCallback(async () => {

    clearLearnTimers()

    const currentIndexBefore =
      controller.getCurrentIndex()

    const next =
      controller.next() as Card | null

    let resolvedNext = next

    if (
      !resolvedNext &&
      nonTableHasMoreRef.current
    ) {
      controller.setCurrentIndex(currentIndexBefore)
      const loaded =
        await loadNextNonTableChunk()

      if (loaded) {
        resolvedNext =
          controller.next() as Card | null
      }
    }

    updateCardAndProgress(resolvedNext)
    void persistLearnProgress()

  }, [
    controller,
    loadNextNonTableChunk,
    persistLearnProgress
  ])

  const prevCard = useCallback(() => {

    clearLearnTimers()

    const previous =
      controller.previous() as Card | null

    updateCardAndProgress(previous)
    void persistLearnProgress()

  }, [controller, persistLearnProgress])

  const rateCard = useCallback((
    feedback: LearnFeedback
  ) => {

    clearLearnTimers()

    if (isTableTopic || learnRandomOrderEnabled) {
      void nextCard()
      return
    }

    const next =
      controller.rateCurrentCard(
        feedback
      ) as Card | null

    updateCardAndProgress(next)
    void persistLearnProgress()

  }, [
    controller,
    isTableTopic,
    learnRandomOrderEnabled,
    nextCard,
    persistLearnProgress
  ])

  const speakCurrentSide = useCallback(() => {
    if (!isFocused || !ttsEnabled || !card) {
      return
    }

    const spokenText = revealed
      ? String(card.answer)
      : card.question

    controller.speak(spokenText)
  }, [isFocused, ttsEnabled, card, revealed, controller])

  const loadCardsForSelectedTopic =
    useCallback(async (restart = false) => {
      if (!db || !activeUser || !selectedTopicId) {
        nonTableTopicIdsRef.current = []
        nonTableLoadedCardsRef.current = []
        nonTableTotalCardsRef.current = 0
        nonTableOffsetRef.current = 0
        nonTableHasMoreRef.current = false
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

      const topics =
        await getAllTopics(db)

      setTopic(selectedTopic ?? null)

      const topicKey =
        selectedTopic?.key ?? ""

      const generatedCards =
        getTableDeck(topicKey)

      if (generatedCards.length > 0) {
        nonTableTopicIdsRef.current = []
        nonTableLoadedCardsRef.current = []
        nonTableTotalCardsRef.current =
          generatedCards.length
        nonTableOffsetRef.current = 0
        nonTableHasMoreRef.current = false
        controller.loadCards(generatedCards)
        if (restart) {
          controller.setCurrentIndex(0)
        } else {
            const savedProgress =
            await getLearnProgress(
              db,
              activeUser,
              selectedTopicId,
              scopedDeviceKey
            )

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
          } else {
            controller.setCurrentIndex(0)
          }
        }

        setCard(controller.getCurrentCard())
        setRevealed(false)
        setProgress(controller.getProgress())
        return
      }

      const topicIds =
        getDescendantTopicIds(
          topics,
          selectedTopicId
        )

      nonTableTopicIdsRef.current =
        topicIds
      nonTableLoadedCardsRef.current = []
      nonTableOffsetRef.current = 0
      nonTableHasMoreRef.current = false

      const totalQuestionCount =
        await getQuestionCountForTopicTree(
          db,
          topicIds
        )

      nonTableTotalCardsRef.current =
        totalQuestionCount

      if (totalQuestionCount === 0) {
        controller.reset()
        setCard(null)
        setRevealed(false)
        setProgress({
          current: 0,
          total: 0
        })
        return
      }

      const savedProgress =
        restart
          ? null
          : await getLearnProgress(
              db,
              activeUser,
              selectedTopicId,
              scopedDeviceKey
            )
      const targetIndex =
        savedProgress?.cardIndex ?? 0
      const targetCardId =
        savedProgress?.cardId ?? null

      const rows =
        await getQuestionsForTopicTree(
          db,
          topicIds,
          LEARN_DB_CHUNK_SIZE,
          "sequence",
          0
        )

      let loadedCards = mapRowsToCards(rows)
      let offset = rows.length
      let hasMore = offset < totalQuestionCount

      const needsMoreForRestore = () => {
        if (!hasMore) {
          return false
        }

        if (
          targetCardId != null &&
          loadedCards.findIndex(
            (card) => card.id === targetCardId
          ) < 0
        ) {
          return true
        }

        return targetIndex >= loadedCards.length
      }

      while (needsMoreForRestore()) {
        const nextRows =
          await getQuestionsForTopicTree(
            db,
            topicIds,
            LEARN_DB_CHUNK_SIZE,
            "sequence",
            offset
          )

        if (nextRows.length === 0) {
          hasMore = false
          break
        }

        loadedCards = [
          ...loadedCards,
          ...mapRowsToCards(nextRows)
        ]
        offset += nextRows.length
        hasMore = offset < totalQuestionCount
      }

      loadedCards =
        await applySmartLearnOrder(loadedCards)

      nonTableLoadedCardsRef.current =
        loadedCards
      nonTableOffsetRef.current = offset
      nonTableHasMoreRef.current = hasMore

      controller.loadCards(loadedCards)

      if (restart) {
        controller.setCurrentIndex(0)
      } else if (savedProgress) {
        const restoredIndex =
          targetCardId != null
            ? loadedCards.findIndex(
                (loadedCard) =>
                  loadedCard.id === targetCardId
              )
            : -1

        controller.setCurrentIndex(
          restoredIndex >= 0
            ? restoredIndex
            : targetIndex
        )
      } else {
        controller.setCurrentIndex(0)
      }

      if (learnRandomOrderEnabledRef.current) {
        controller.shuffleRemaining()
      }

      updateCardAndProgress(
        controller.getCurrentCard() as Card | null
      )
  }, [
    activeUser,
    applySmartLearnOrder,
    scopedDeviceKey,
    controller,
    db,
    persistLearnProgress,
    selectedTopicId
  ])

  const restartLearnSession = useCallback(() => {
    clearLearnTimers()
    controller.reset()
    setRevealed(false)
    void loadCardsForSelectedTopic(true)
  }, [
    controller,
    loadCardsForSelectedTopic
  ])

  const toggleLearnRandomOrder = useCallback(() => {
    const nextEnabled = !learnRandomOrderEnabled
    setLearnRandomOrderEnabled(nextEnabled)

    if (!nextEnabled) {
      return
    }

    controller.shuffleRemaining()
    updateCardAndProgress(
      controller.getCurrentCard() as Card | null
    )
    void persistLearnProgress()
  }, [
    controller,
    learnRandomOrderEnabled,
    persistLearnProgress,
    setLearnRandomOrderEnabled
  ])

  useEffect(() => {
    Animated.timing(completionAnim, {
      toValue:
        !card && selectedTopicId && progress.total > 0
          ? 1
          : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start()
  }, [card, completionAnim, progress.total, selectedTopicId])

  useEffect(() => {
    void loadCardsForSelectedTopic()
  }, [
    loadCardsForSelectedTopic
  ])

  useEffect(() => {
    if (
      !db ||
      !activeUser ||
      !selectedTopicId
    ) {
      return
    }

    let cancelled = false

    const reloadFromSyncedProgress = async () => {
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
      await loadCardsForSelectedTopic()
    }

    const unsubscribe = subscribeSyncMetaChanges(() => {
      void reloadFromSyncedProgress()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [
    activeUser,
    db,
    loadCardsForSelectedTopic,
    selectedTopicId
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
      !isFocused ||
      !learnAutoPlayEnabled ||
      !card
    ) {
      return
    }

    setRevealed(false)

    autoFlipTimeoutRef.current = setTimeout(() => {
      setRevealed(true)

      autoNextTimeoutRef.current = setTimeout(() => {
        void nextCard()
      }, learnBackDelaySeconds * 1000)
    }, learnFrontDelaySeconds * 1000)

    return () => {
      clearLearnTimers()
    }

  }, [
    card,
    isFocused,
    learnAutoPlayEnabled,
    learnFrontDelaySeconds,
    learnBackDelaySeconds,
    nextCard
  ])

  useEffect(() => {
    if (isFocused) {
      return
    }

    clearLearnTimers()
    ttsService.stop()
  }, [isFocused])

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
    settingsLoading ||
    preferencesLoading ||
    deviceLoading ||
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
                onPress={toggleLearnRandomOrder}
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

          {!isTableTopic && !learnRandomOrderEnabled ? (
            <View
              style={[
                styles.smartLearnBadge,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border
                }
              ]}
            >
              <Text
                style={[
                  styles.smartLearnBadgeText,
                  { color: colors.text }
                ]}
              >
                Smart Learn: weak and due cards are shown first
              </Text>
            </View>
          ) : null}
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
            <Text
              style={[
                styles.cardProgress,
                { color: colors.muted }
              ]}
            >
              Card {progress.current} of {progress.total}
            </Text>
          ) : null}

              {card ? (
                <FlashCard
                  question={card.question}
                  answer={String(card.answer)}
                  revealed={revealed}
                  onToggle={setRevealed}
                  colors={colors}
                />
          ) : (
            <Animated.View
              style={[
                styles.completionWrap,
                {
                  opacity: completionAnim,
                  transform: [
                    {
                      scale: completionAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1]
                      })
                    },
                    {
                      translateY: completionAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0]
                      })
                    }
                  ]
                }
              ]}
            >
              <Text
                style={[styles.placeholder, { color: colors.muted }]}
              >
                {selectedTopicId
                  ? progress.total > 0
                    ? "Topic complete"
                    : "No cards are ready for this topic yet."
                  : "Choose a topic before learning."}
              </Text>
              {selectedTopicId && progress.total > 0 ? (
                <Pressable
                  style={[
                    styles.controlButton,
                    {
                      backgroundColor: colors.iconActive,
                      marginTop: 16,
                      ...restartButtonPadding
                    }
                  ]}
                  onPress={restartLearnSession}
                >
                  <Text
                    style={[
                      styles.controlText,
                      { color: "#ffffff" }
                    ]}
                  >
                    Learn more
                  </Text>
                </Pressable>
              ) : null}
            </Animated.View>
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
    padding: 12,
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
    padding: 14
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

  smartLearnBadge: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6
  },

  smartLearnBadgeText: {
    fontSize: 12,
    fontWeight: "700"
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

  cardProgress: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10
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

  completionWrap: {
    alignItems: "center"
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
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center"
  },

  controlText: {
    color: "#0f172a",
    fontWeight: "700"
  },

})
