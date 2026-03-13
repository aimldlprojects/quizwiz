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
import { useDatabase } from "../../hooks/useDatabase"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"

type Card = {
  id: number
  question: string
  answer: string | number
}

type TopicInfo = {
  id: number
  name: string
}

export default function LearnScreen() {

  const controller = useMemo(
    () => new LearnController(),
    []
  )

  const { db, loading } = useDatabase()
  const {
    selectedTopicId,
    ttsEnabled,
    setTtsEnabled,
    loading: preferencesLoading
  } = useStudyPreferences(db)

  const [card, setCard] =
    useState<Card | null>(null)
  const [selectedTable, setSelectedTable] =
    useState<number | null>(null)
  const [topicName, setTopicName] =
    useState<string>("")
  const [progress, setProgress] = useState({
    current: 0,
    total: 0
  })

  useEffect(() => {

    async function loadSelectedTopic() {

      if (!db || !selectedTopicId) {
        setTopicName("")
        controller.reset()
        setCard(null)
        setProgress({
          current: 0,
          total: 0
        })
        return
      }

      const topic =
        await db.getFirstAsync<TopicInfo>(
          `
          SELECT id, name
          FROM topics
          WHERE id = ?
          `,
          [selectedTopicId]
        )

      setTopicName(topic?.name ?? "")

      if (topic?.name === "Tables") {
        controller.reset()
        setCard(null)
        setSelectedTable(null)
        setProgress({
          current: 0,
          total: 0
        })
        return
      }

      const rows =
        await db.getAllAsync<Card>(
          `
          SELECT
            id,
            question,
            answer
          FROM questions
          WHERE topic_id = ?
          ORDER BY id
          `,
          [selectedTopicId]
        )

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
      setSelectedTable(null)
    }

    loadSelectedTopic()

  }, [db, selectedTopicId, controller])

  function loadTable(table: number) {

    controller.loadTables(table)

    const currentCard =
      controller.getCurrentCard() as Card | null

    setSelectedTable(table)
    setCard(currentCard)
    setProgress(controller.getProgress())

  }

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

  if (loading || preferencesLoading || !db) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading learn mode...
        </Text>
      </SafeAreaView>
    )
  }

  const showsTables =
    topicName === "Tables"

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.kicker}>
                Learn mode
              </Text>

              <Text style={styles.title}>
                {topicName
                  ? `Learning ${topicName}`
                  : "Choose a topic first"}
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
            {showsTables
              ? "Pick any table from 1 to 20."
              : selectedTopicId
              ? "Flip through the current topic cards."
              : "Open the Topics tab and choose what to study."}
          </Text>
        </View>

        {showsTables ? (
          <View style={styles.selector}>
            {Array.from({ length: 20 }, (_, index) => {

              const table = index + 1
              const selected =
                selectedTable === table

              return (
                <Pressable
                  key={table}
                  style={[
                    styles.tableButton,
                    selected &&
                      styles.selectedTableButton
                  ]}
                  onPress={() => loadTable(table)}
                >
                  <Text
                    style={[
                      styles.tableButtonText,
                      selected &&
                        styles.selectedTableButtonText
                    ]}
                  >
                    {table}
                  </Text>
                </Pressable>
              )

            })}
          </View>
        ) : null}

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
                ? "Choose a table or start with the selected topic."
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

  selector: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10
  },

  tableButton: {
    width: "18%",
    minWidth: 58,
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#93c5fd"
  },

  selectedTableButton: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb"
  },

  tableButtonText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e3a5f"
  },

  selectedTableButtonText: {
    color: "#ffffff"
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
