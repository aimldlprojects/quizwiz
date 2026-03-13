import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import { useEffect, useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import FlashCard from "../../components/FlashCard"
import { LearnController } from "../../controllers/learnController"
import {
  getAllTopics,
  getDescendantTopicIds,
  getQuestionsForTopicTree,
  getTopicById,
  TopicRecord
} from "../../database/contentRepository"
import { useDatabase } from "../../hooks/useDatabase"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"
import { useUsers } from "../../hooks/useUsers"
import { generateLearnCardsForTopic } from "../../engine/questions/questionFactory"

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
    loading: preferencesLoading
  } = useStudyPreferences(
    db,
    activeUser
  )

  const [card, setCard] =
    useState<Card | null>(null)
  const [topic, setTopic] =
    useState<TopicRecord | null>(null)
  const [progress, setProgress] = useState({
    current: 0,
    total: 0
  })

  useEffect(() => {

    async function loadCards() {

      if (!db || !selectedTopicId) {
        controller.reset()
        setCard(null)
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
        generateLearnCardsForTopic(topicKey)

      if (generatedCards.length > 0) {
        controller.loadCards(generatedCards)
        setCard(controller.getCurrentCard())
        setProgress(controller.getProgress())
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
          topicIds
        )

      if (rows.length === 0) {
        controller.reset()
        setCard(null)
        setProgress({
          current: 0,
          total: 0
        })
        return
      }

      controller.loadCards(
        rows.map((row) => ({
          id: row.id,
          question: row.question,
          answer: Number.isNaN(
            Number(row.answer)
          )
            ? row.answer
            : Number(row.answer)
        }))
      )

      setCard(controller.getCurrentCard())
      setProgress(controller.getProgress())

    }

    loadCards()

  }, [db, selectedTopicId, controller])

  useEffect(() => {

    if (!ttsEnabled || !card) {
      return
    }

    controller.speak(card.question)

  }, [ttsEnabled, card, controller])

  function nextCard() {

    const next =
      controller.next() as Card | null

    setCard(next)
    setProgress(controller.getProgress())

  }

  function prevCard() {

    const previous =
      controller.previous() as Card | null

    setCard(previous)
    setProgress(controller.getProgress())

  }

  function replayQuestion() {

    if (!card) return

    controller.speak(card.question)

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>
                Learn mode
              </Text>

              <Text style={styles.title}>
                {topic?.name ??
                  "Choose a topic first"}
              </Text>
            </View>

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
          </View>

          <Text style={styles.subtitle}>
            {getTopicDescription(topic)}
          </Text>
        </View>

        <View style={styles.cardShell}>
          {card ? (
            <>
              <View style={styles.cardActions}>
                <Pressable
                  style={styles.smallButton}
                  onPress={replayQuestion}
                >
                  <MaterialIcons
                    name="play-arrow"
                    size={18}
                    color="#ffffff"
                  />
                </Pressable>
              </View>

              <FlashCard
                question={card.question}
                answer={String(card.answer)}
              />
            </>
          ) : (
            <Text style={styles.placeholder}>
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
                style={styles.controlButton}
                onPress={prevCard}
              >
                <Text style={styles.controlText}>
                  Previous
                </Text>
              </Pressable>

              <Pressable
                style={styles.controlButton}
                onPress={nextCard}
              >
                <Text style={styles.controlText}>
                  Next
                </Text>
              </Pressable>
            </View>

            <Text style={styles.progress}>
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
    backgroundColor: "#2563eb",
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

  cardActions: {
    alignItems: "flex-end",
    marginBottom: 12
  },

  smallButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center"
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
    backgroundColor: "#1d4ed8",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center"
  },

  controlText: {
    color: "#ffffff",
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
