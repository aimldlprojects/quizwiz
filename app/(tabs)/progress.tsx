import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useFocusEffect } from "@react-navigation/native"

import { StatsRepository } from "../../database/statsRepository"
import { StreakController } from "../../controllers/streakController"
import { useDatabase } from "../../hooks/useDatabase"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"
import { useUsers } from "../../hooks/useUsers"
import { subscribeSyncMetaChanges } from "../../database/syncMetaRepository"
import { getThemeColors } from "../../styles/theme"

export default function ProgressScreen() {

  const { db, loading } = useDatabase()
  const {
    activeUser,
    loading: usersLoading
  } = useUsers(db)
  const { themeMode } = useStudyPreferences(db, activeUser)
  const colors = getThemeColors(themeMode)

  const [accuracy, setAccuracy] =
    useState(0)
  const [overallTotals, setOverallTotals] =
    useState({
      attempts: 0,
      correct: 0
    })
  const [overallQuestionCount, setOverallQuestionCount] =
    useState(0)
  const [topics, setTopics] =
    useState<any[]>([])
  const [subjects, setSubjects] =
    useState<any[]>([])

  const aggregatedSubjects = useMemo(
    () => aggregateSubjects(subjects),
    [subjects]
  )
  const [streak, setStreak] =
    useState(0)

  const loadProgress = useCallback(async () => {

    if (!db || !activeUser) return

    const statsRepo =
      new StatsRepository(db)
    const streakController =
      new StreakController(db)

    const totals =
      await statsRepo.getAccuracyTotals(activeUser)
    const totalQuestions =
      await statsRepo.getTotalQuestionCount()
    const acc =
      totals.attempts === 0
        ? 0
        : Math.round(
            (totals.correct / totals.attempts) * 100
          )

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
    setOverallTotals(totals)
    setOverallQuestionCount(totalQuestions)
    setTopics(topicData)
    setSubjects(subjectData)
    setStreak(streakState.currentStreak)

  }, [db, activeUser])

  useFocusEffect(
    useCallback(() => {
      loadProgress()
    }, [loadProgress])
  )

  useEffect(() => {
    if (!db || !activeUser) {
      return
    }

    return subscribeSyncMetaChanges(() => {
      void loadProgress()
    })
  }, [db, activeUser, loadProgress])

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
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background }
      ]}
    >
      <ScrollView
        style={[
          styles.container,
          { backgroundColor: colors.background }
        ]}
      >
        <Text
          style={[styles.title, { color: colors.text }]}
        >
          Progress Map
        </Text>

        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card }
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text }
            ]}
          >
            Overall Accuracy
          </Text>

          <Text style={styles.bigValue}>
            {accuracy}%
          </Text>

          <Text
            style={[
              styles.heroMeta,
              { color: colors.text }
            ]}
          >
            {overallTotals.correct}/{overallTotals.attempts} correct
          </Text>

          <Text
            style={[
              styles.heroMeta,
              { color: colors.muted }
            ]}
          >
            {overallTotals.attempts}/{overallQuestionCount} attempts
          </Text>

            <Text
              style={[
                styles.heroSubtext,
                { color: colors.muted }
              ]}
            >
              Continuous practice days in a row:{" "}
              {streak} day{streak === 1 ? "" : "s"}
            </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border
            }
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text }
            ]}
          >
            Topics
          </Text>

          {buildTopicRows(topics).map((topic) => (
            <View
              key={topic.topicId}
              style={styles.progressItem}
            >
              <View
                style={[
                  styles.row,
                  topic.level > 0 &&
                    styles.indentedRow
                ]}
              >
                <Text
                  style={[
                    styles.rowLabel,
                    topic.level > 0 &&
                      styles.childRowLabel,
                    { color: colors.text }
                  ]}
                >
                  {topic.indexLabel} {topic.topicName}
                </Text>

                <Text
                  style={[
                    styles.rowValue,
                    { color: colors.text }
                  ]}
                >
                  {topic.progress}%
                </Text>
              </View>

              <Text
                style={[
                  styles.detailText,
                  topic.level > 0 &&
                    styles.indentedDetailText,
                  { color: colors.muted }
                ]}
              >
                {topic.correct}/{topic.practiced} correct
                {"  "}•{"  "}
                {topic.practiced}/{topic.totalQuestions} attempts
              </Text>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border
            }
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text }
            ]}
          >
            Subjects
          </Text>

        {aggregatedSubjects.map((subject) => (
            <View
              key={subject.subjectId}
              style={styles.progressItem}
            >
              <View style={styles.row}>
                <Text
                  style={[
                    styles.rowLabel,
                    { color: colors.text }
                  ]}
                >
                  {subject.subjectName}
                </Text>

                <Text
                  style={[
                    styles.rowValue,
                    { color: colors.text }
                  ]}
                >
                  {subject.progress}%
                </Text>
              </View>

              <Text
                style={[styles.detailText, { color: colors.muted }]}
              >
                {subject.correct}/{subject.practiced} correct
                {"  "}•{"  "}
                {subject.practiced}/{subject.totalQuestions} attempts
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
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700"
  },

  heroMeta: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700"
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
    gap: 12
  },

  progressItem: {
    marginBottom: 10
  },

  indentedRow: {
    paddingLeft: 18
  },

  rowLabel: {
    flex: 1,
    fontSize: 16,
    color: "#475569"
  },

  childRowLabel: {
    color: "#64748b"
  },

  detailText: {
    color: "#64748b",
    fontSize: 13
  },

  indentedDetailText: {
    paddingLeft: 18
  },

  rowValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a5f"
  }

})

function buildTopicRows(
  topics: {
    topicId: number
    topicName: string
    parentTopicId: number | null
    progress: number
  }[]
) {

  const childrenByParent = new Map<
    number | null,
    typeof topics
  >()

  for (const topic of topics) {
    const siblings =
      childrenByParent.get(topic.parentTopicId) ?? []

    siblings.push(topic)
    childrenByParent.set(topic.parentTopicId, siblings)
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((left, right) =>
      left.topicName.localeCompare(
        right.topicName
      )
    )
  }

  const rows: (
    (typeof topics)[number] & {
      level: number
      indexLabel: string
    }
  )[] = []

  function visit(
    parentId: number | null,
    level: number,
    prefix: string
  ) {

    const siblings =
      childrenByParent.get(parentId) ?? []

    siblings.forEach((topic, index) => {
      const indexLabel =
        prefix === ""
          ? String(index + 1)
          : `${prefix}.${index + 1}`

      rows.push({
        ...topic,
        level,
        indexLabel
      })

      visit(
        topic.topicId,
        level + 1,
        indexLabel
      )
    })

  }

  visit(null, 0, "")

  return rows

}

function aggregateSubjects(
  subjects: {
    subjectId: number
    subjectName: string
    totalQuestions: number
    practiced: number
    correct: number
    progress: number
  }[]
) {

  const byName = new Map<
    string,
    {
      subjectId: number
      subjectName: string
      totalQuestions: number
      practiced: number
      correct: number
    }
  >()

  for (const subject of subjects) {
    const key = normalizeSubjectName(subject.subjectName)
    const current = byName.get(key)

    if (current) {
      current.totalQuestions += subject.totalQuestions
      current.practiced += subject.practiced
      current.correct += subject.correct
      current.subjectId = Math.min(
        current.subjectId,
        subject.subjectId
      )
    } else {
      byName.set(key, {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        totalQuestions: subject.totalQuestions,
        practiced: subject.practiced,
        correct: subject.correct
      })
    }
  }

  return (
    Array.from(byName.values())
      .map((entry) => {
        const progress =
          entry.practiced === 0
            ? 0
            : Math.round(
                (entry.correct / entry.practiced) *
                  100
              )

        return {
          ...entry,
          progress
        }
      })
      .sort((left, right) =>
        left.subjectName.localeCompare(
          right.subjectName
        )
      )
  )

}

function normalizeSubjectName(
  value: string
) {

  return value.trim().toLowerCase()

}
