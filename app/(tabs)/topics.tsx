import { useEffect, useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { useDatabase } from "../../hooks/useDatabase"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"
import {
  getAllTopics,
  getTopicLineage
} from "../../database/contentRepository"
import { useUsers } from "../../hooks/useUsers"
import { UserSubjectRepository } from "../../database/userSubjectRepository"
import { getThemeColors } from "../../styles/theme"

type Subject = {
  id: number
  name: string
}

type Topic = {
  id: number
  key: string | null
  name: string
  subject_id: number
  parent_topic_id: number | null
}

export default function TopicsScreen() {

  const { db, loading } = useDatabase()
  const {
    activeUser,
    setSubjectEnabled,
    setTopicEnabled,
    loading: usersLoading
  } = useUsers(db)
  const {
    selectedSubjectId,
    selectedTopicId,
    setSelectedSubjectId,
    setSelectedTopicId,
    themeMode,
    loading: preferencesLoading
  } = useStudyPreferences(
    db,
    activeUser
  )
  const colors = getThemeColors(themeMode)

  const [subjects, setSubjects] =
    useState<Subject[]>([])
  const [topics, setTopics] =
    useState<Topic[]>([])
  const [topicQuestionCounts, setTopicQuestionCounts] =
    useState<Record<number, number>>({})
  const [allowedTopicIds, setAllowedTopicIds] =
    useState<Set<number>>(new Set())
  const [pendingSubjectToggle, setPendingSubjectToggle] =
    useState<number | null>(null)
  const [pendingTopicToggle, setPendingTopicToggle] =
    useState<number | null>(null)

  useEffect(() => {

    async function loadOptions() {

      if (!db) return

      if (!activeUser) {
        setSubjects([])
        setTopics([])
        return
      }

      const loadedSubjects =
        await db.getAllAsync<Subject>(
          `
          SELECT id, name
          FROM subjects
          ORDER BY name
          `
        )

      const loadedTopics =
        await getAllTopics(db)
      const accessRepo =
        new UserSubjectRepository(db)
      const allowedTopics =
        await accessRepo.getAllowedTopics(
          activeUser
        )
      const questionCountRows =
        await db.getAllAsync<{
          topic_id: number
          count: number
        }>(
          `
          SELECT
            topic_id,
            COUNT(*) as count
          FROM questions
          GROUP BY topic_id
          `
        )

      setSubjects(loadedSubjects)
      setTopics(loadedTopics)
      setAllowedTopicIds(
        new Set(
          allowedTopics.map((topic) => topic.id)
        )
      )
      setTopicQuestionCounts(
        Object.fromEntries(
          questionCountRows.map((row) => [
            row.topic_id,
            row.count
          ])
        )
      )

    }

    loadOptions()

  }, [db, activeUser])

  const selectedTopic =
    topics.find((topic) => topic.id === selectedTopicId)
  const lineage =
    getTopicLineage(
      topics,
      selectedTopicId
    )
  const lineageIds = new Set(
    lineage.map((topic) => topic.id)
  )
  const availableTopicIds =
    getAvailableTopicIds(
      topics,
      topicQuestionCounts
    )
  const topicStatus =
    useMemo(
      () =>
        buildTopicStatusMap(
          topics.filter((topic) =>
            availableTopicIds.has(topic.id)
          ),
          allowedTopicIds
        ),
      [topics, availableTopicIds, allowedTopicIds]
    )
  const visibleSubjects =
    subjects.filter((subject) =>
      topics.some(
        (topic) =>
          topic.subject_id === subject.id &&
          availableTopicIds.has(topic.id)
      )
    )
  const subjectStatus =
    useMemo(
      () =>
        buildSubjectStatusMap(
          visibleSubjects,
          topics.filter((topic) =>
            availableTopicIds.has(topic.id)
          ),
          topicStatus
        ),
      [
        visibleSubjects,
        topics,
        availableTopicIds,
        topicStatus
      ]
    )

  useEffect(() => {

    if (
      visibleSubjects.length > 0 &&
      selectedSubjectId != null &&
      !visibleSubjects.some(
        (subject) =>
          subject.id === selectedSubjectId
      )
    ) {
      setSelectedSubjectId(null)
    }

  }, [
    visibleSubjects,
    selectedSubjectId,
    setSelectedSubjectId
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
          Loading learning path...
        </Text>
      </SafeAreaView>
    )
  }

  const topicLevels: Topic[][] = []

  if (selectedSubjectId != null) {
    let parentId: number | null = null

    while (true) {
      const levelTopics =
        topics.filter(
          (topic) =>
            topic.subject_id ===
              selectedSubjectId &&
            topic.parent_topic_id === parentId &&
            availableTopicIds.has(topic.id)
        )

      if (levelTopics.length === 0) {
        break
      }

      topicLevels.push(levelTopics)

      const selectedLevelTopic =
        lineage.find(
          (topic) =>
            topic.parent_topic_id === parentId
        )

      if (!selectedLevelTopic) {
        break
      }

      parentId = selectedLevelTopic.id
    }
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background }
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        style={{ backgroundColor: colors.background }}
      >
        <Text
          style={[styles.title, { color: colors.text }]}
        >
          Choose Subject and Topic
        </Text>

        <Text
          style={[styles.subtitle, { color: colors.muted }]}
        >
          Pick what to study before opening
          Learn or Practice.
        </Text>

        <Text
          style={[styles.helperText, { color: colors.muted }]}
        >
          Green means allowed, white means off, yellow means some child topics are off, and the blue border shows your current path.
        </Text>

        {activeUser && visibleSubjects.length === 0 ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>
              No playable subjects
            </Text>

            <Text style={styles.noticeText}>
              Ask the admin to enable a subject that has at least one playable topic.
            </Text>
          </View>
        ) : null}

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
              styles.sectionTitle,
              { color: colors.text }
            ]}
          >
            Subjects
          </Text>

            <View style={styles.chipWrap}>
            {visibleSubjects.map((subject) => {
              const isPending =
                pendingSubjectToggle === subject.id

              return (
                <Pressable
                  key={subject.id}
                  style={[
                    styles.chip,
                    subjectStatus[subject.id] ===
                      "all" &&
                      styles.allowedChip,
                    subjectStatus[subject.id] ===
                      "partial" &&
                      styles.partialChip,
                    selectedSubjectId === subject.id &&
    styles.selectedChipPath,
    isPending && styles.pendingChip
  ]}
                  onPress={async () => {
                    if (!activeUser) {
                      return
                    }

                    const alreadyPending =
                      pendingSubjectToggle === subject.id

                    await setSelectedSubjectId(
                      subject.id
                    )

                    if (!alreadyPending) {
                      setPendingSubjectToggle(
                        subject.id
                      )
                      setPendingTopicToggle(null)
                      return
                    }

                    setPendingSubjectToggle(null)
                    setPendingTopicToggle(null)

                    await setSubjectEnabled(
                      activeUser,
                      subject.id,
                      subjectStatus[subject.id] !==
                        "all"
                    )

                    const accessRepo =
                      new UserSubjectRepository(db)
                    const allowedTopics =
                      await accessRepo.getAllowedTopics(
                        activeUser
                      )

                    setAllowedTopicIds(
                      new Set(
                        allowedTopics.map(
                          (topic) => topic.id
                        )
                      )
                    )
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      subjectStatus[subject.id] ===
                        "all" &&
                        styles.allowedChipText
                    ]}
                  >
                    {subject.name}
                  </Text>
                </Pressable>
              )
            })}
          </View>
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
              styles.sectionTitle,
              { color: colors.text }
            ]}
          >
            Topics
          </Text>

          {selectedSubjectId == null ? (
            <Text
              style={[
                styles.helperText,
                { color: colors.muted }
              ]}
            >
              Select a subject first.
            </Text>
          ) : (
            topicLevels.map(
              (levelTopics, levelIndex) => (
                <View
                  key={`level-${levelIndex}`}
                  style={styles.levelBlock}
                >
                  <Text style={styles.levelTitle}>
                    Level {levelIndex + 1}
                  </Text>

                  <View style={styles.chipWrap}>
                    {levelTopics.map((topic) => {
                      const isInLineage =
                        lineageIds.has(topic.id)
                      const isPending =
                        pendingTopicToggle === topic.id

                      return (
                        <Pressable
                          key={topic.id}
                          style={[
                            styles.chip,
                            topicStatus[topic.id] ===
                              "all" &&
                              styles.allowedChip,
                            topicStatus[topic.id] ===
                              "partial" &&
                              styles.partialChip,
                            isInLineage &&
                              styles.selectedChipPath,
                            isPending && styles.pendingChip
                          ]}
                          onPress={async () => {
                            if (!activeUser) {
                              return
                            }

                            const alreadyPending =
                              pendingTopicToggle === topic.id

                            await setSelectedTopicId(
                              topic.id
                            )

                            if (!alreadyPending) {
                              setPendingTopicToggle(topic.id)
                              return
                            }

                            setPendingTopicToggle(null)

                            const shouldEnable =
                              !allowedTopicIds.has(
                                topic.id
                              )

                            await setTopicEnabled(
                              activeUser,
                              topic.id,
                              shouldEnable
                            )

                            const accessRepo =
                              new UserSubjectRepository(
                                db
                              )
                            const allowedTopics =
                              await accessRepo.getAllowedTopics(
                                activeUser
                              )

                            setAllowedTopicIds(
                              new Set(
                                allowedTopics.map(
                                  (allowedTopic) =>
                                    allowedTopic.id
                                )
                              )
                            )
                          }}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              topicStatus[topic.id] ===
                                "all" &&
                                styles.allowedChipText
                            ]}
                          >
                            {topic.name}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              )
            )
          )}
        </View>

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border
            }
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text }
            ]}
          >
            Current selection
          </Text>

          <Text
            style={[
              styles.summaryText,
              { color: colors.text }
            ]}
          >
            Subject:{" "}
            {visibleSubjects.find(
              (subject) =>
                subject.id === selectedSubjectId
            )?.name ?? "Not selected"}
          </Text>

          <Text
            style={[
              styles.summaryText,
              { color: colors.text }
            ]}
          >
            Topic:{" "}
            {selectedTopic?.name ?? "Not selected"}
          </Text>

          <Text
            style={[
              styles.helperText,
              { color: colors.muted }
            ]}
          >
            Path:{" "}
            {lineage.length === 0
              ? "Choose a topic"
              : lineage
                  .map((topic) => topic.name)
                  .join(" -> ")}
          </Text>
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
    padding: 20,
    gap: 16,
    paddingBottom: 120
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
    color: "#1e3a5f"
  },

  subtitle: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 22
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18
  },

  noticeCard: {
    backgroundColor: "#fff7ed",
    borderRadius: 22,
    padding: 18
  },

  noticeTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#9a3412",
    marginBottom: 6
  },

  noticeText: {
    color: "#9a3412",
    lineHeight: 21
  },

  summaryCard: {
    backgroundColor: "#dbeafe",
    borderRadius: 22,
    padding: 18
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e3a5f",
    marginBottom: 12
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },

  levelBlock: {
    marginBottom: 14
  },

  levelTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 10
  },

  chip: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "#dbe4f0"
  },

  allowedChip: {
    backgroundColor: "#16a34a"
  },

  pendingChip: {
    borderColor: "#0ea5e9",
    borderWidth: 3
  },

  partialChip: {
    backgroundColor: "#fde68a"
  },

  selectedChipPath: {
    borderColor: "#0ea5e9",
    borderWidth: 3
  },

  chipText: {
    color: "#1e3a5f",
    fontWeight: "700"
  },

  allowedChipText: {
    color: "#ffffff"
  },

  helperText: {
    color: "#475569",
    lineHeight: 21
  },

  summaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a5f",
    marginBottom: 8
  }

})

const GENERATOR_TOPIC_KEYS = new Set([
  "multiplication_tables",
  "tables_1_5",
  "tables_6_10",
  "tables_11_15",
  "tables_16_20",
  "addition",
  "subtraction",
  "division",
  "word_problems"
])

function getAvailableTopicIds(
  topics: Topic[],
  questionCounts: Record<number, number>
) {

  const available = new Set<number>()
  const childrenByParent = new Map<
    number | null,
    Topic[]
  >()

  for (const topic of topics) {
    const parentId =
      topic.parent_topic_id ?? null
    const siblings =
      childrenByParent.get(parentId) ?? []

    siblings.push(topic)
    childrenByParent.set(parentId, siblings)
  }

  function hasPlayableContent(
    topic: Topic
  ): boolean {

    if (
      (questionCounts[topic.id] ?? 0) > 0 ||
      (topic.key != null &&
        GENERATOR_TOPIC_KEYS.has(topic.key))
    ) {
      available.add(topic.id)
      return true
    }

    const children =
      childrenByParent.get(topic.id) ?? []

    let childPlayable = false

    for (const child of children) {
      if (hasPlayableContent(child)) {
        childPlayable = true
      }
    }

    if (childPlayable) {
      available.add(topic.id)
    }

    return childPlayable

  }

  for (const rootTopic of topics) {
    hasPlayableContent(rootTopic)
  }

  return available

}

function buildTopicStatusMap(
  topics: Topic[],
  allowedTopicIds: Set<number>
) {

  const childrenByParent = new Map<
    number | null,
    Topic[]
  >()
  const statusMap: Record<
    number,
    "all" | "partial" | "off"
  > = {}

  for (const topic of topics) {
    const parentId =
      topic.parent_topic_id ?? null
    const siblings =
      childrenByParent.get(parentId) ?? []

    siblings.push(topic)
    childrenByParent.set(parentId, siblings)
  }

  function getStatus(
    topic: Topic
  ): "all" | "partial" | "off" {

    const children =
      childrenByParent.get(topic.id) ?? []

    if (children.length === 0) {
      return allowedTopicIds.has(topic.id)
        ? "all"
        : "off"
    }

    const childStatuses =
      children.map(getStatus)
    const selfAllowed =
      allowedTopicIds.has(topic.id)
    const allChildrenAllowed =
      childStatuses.every(
        (status) => status === "all"
      )
    const anyAllowed =
      selfAllowed ||
      childStatuses.some(
        (status) => status !== "off"
      )

    if (selfAllowed && allChildrenAllowed) {
      return "all"
    }

    return anyAllowed ? "partial" : "off"

  }

  for (const topic of topics) {
    statusMap[topic.id] = getStatus(topic)
  }

  return statusMap

}

function buildSubjectStatusMap(
  subjects: Subject[],
  topics: Topic[],
  topicStatus: Record<
    number,
    "all" | "partial" | "off"
  >
) {

  const statusMap: Record<
    number,
    "all" | "partial" | "off"
  > = {}

  for (const subject of subjects) {
    const subjectTopics =
      topics.filter(
        (topic) =>
          topic.subject_id === subject.id
      )

    if (subjectTopics.length === 0) {
      statusMap[subject.id] = "off"
      continue
    }

    const statuses = subjectTopics.map(
      (topic) => topicStatus[topic.id] ?? "off"
    )

    if (
      statuses.every(
        (status) => status === "all"
      )
    ) {
      statusMap[subject.id] = "all"
      continue
    }

    if (
      statuses.some(
        (status) => status !== "off"
      )
    ) {
      statusMap[subject.id] = "partial"
      continue
    }

    statusMap[subject.id] = "off"
  }

  return statusMap

}
