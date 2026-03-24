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
import { useFocusEffect } from "@react-navigation/native"
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
    loading: usersLoading
  } = useUsers(db)
  const {
    selectedSubjectId,
    selectedTopicId,
    selectedSubjectIds,
    selectedTopicLevel1Ids,
    selectedTopicLevel2Ids,
    toggleSubjectSelection,
    toggleTopicSelection,
    themeMode,
    loading: preferencesLoading
  } = useStudyPreferences(
    db,
    activeUser
  )
  const colors = getThemeColors(themeMode)

  const selectedSubjectIdsSet = useMemo(
    () => new Set(selectedSubjectIds),
    [selectedSubjectIds]
  )
  const selectedTopicLevel1IdsSet = useMemo(
    () => new Set(selectedTopicLevel1Ids),
    [selectedTopicLevel1Ids]
  )
  const selectedTopicLevel2IdsSet = useMemo(
    () => new Set(selectedTopicLevel2Ids),
    [selectedTopicLevel2Ids]
  )
  const selectedTopicIdsSet = useMemo(
    () =>
      new Set([
        ...selectedTopicLevel1Ids,
        ...selectedTopicLevel2Ids,
        ...(selectedTopicId == null
          ? []
          : [selectedTopicId])
      ]),
    [
      selectedTopicLevel1Ids,
      selectedTopicLevel2Ids,
      selectedTopicId
    ]
  )

  const [subjects, setSubjects] =
    useState<Subject[]>([])
  const [topics, setTopics] =
    useState<Topic[]>([])
  const [topicQuestionCounts, setTopicQuestionCounts] =
    useState<Record<number, number>>({})
  const [allowedTopicIds, setAllowedTopicIds] =
    useState<Set<number>>(new Set())
  const [activeSubjectId, setActiveSubjectId] =
    useState<number | null>(null)
  const [activeTopicPath, setActiveTopicPath] =
    useState<number[]>([])
  const navigationSubjectId =
    activeSubjectId ?? selectedSubjectId
  const previousNavigationSubjectId =
    useRef<number | null>(null)

  const logTopicsState = useCallback(
    (reason: string) => {
      console.log("[topics-state] selected", {
        reason,
        userId: activeUser,
        selectedSubjectId,
        selectedSubjectIds: Array.from(
          selectedSubjectIdsSet
        ),
        selectedTopicId,
        selectedTopicIds: Array.from(
          selectedTopicIdsSet
        ),
        selectedTopicLevel1Ids: Array.from(
          selectedTopicLevel1IdsSet
        ),
        selectedTopicLevel2Ids: Array.from(
          selectedTopicLevel2IdsSet
        ),
        navigationSubjectId,
        activeSubjectId,
        activeTopicPath: [...activeTopicPath]
      })
    },
    [
      activeUser,
      activeSubjectId,
      activeTopicPath,
      navigationSubjectId,
      selectedSubjectId,
      selectedSubjectIdsSet,
      selectedTopicId,
      selectedTopicIdsSet,
      selectedTopicLevel1IdsSet,
      selectedTopicLevel2IdsSet
    ]
  )

  useFocusEffect(
    useCallback(() => {
      logTopicsState("focus")
    }, [logTopicsState])
  )

  useEffect(() => {
    logTopicsState("state-change")
  }, [logTopicsState])

  useEffect(() => {

    setActiveSubjectId(null)
    setActiveTopicPath([])

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

  useEffect(() => {
    if (
      previousNavigationSubjectId.current !==
      navigationSubjectId
    ) {
      setActiveTopicPath([])
    }

    previousNavigationSubjectId.current =
      navigationSubjectId
  }, [navigationSubjectId])

  const lineage =
    getTopicLineage(
      topics,
      selectedTopicId
    )
  const availableTopicIds =
    getAvailableTopicIds(
      topics,
      topicQuestionCounts
    )
  const allowedTopicsList = useMemo(
    () =>
      topics.filter(
        (topic) =>
          availableTopicIds.has(topic.id) &&
          allowedTopicIds.has(topic.id)
      ),
    [topics, availableTopicIds, allowedTopicIds]
  )
  const selectedTopicsSort = useMemo(() => {
    const byId = new Map(
      topics.map((topic) => [topic.id, topic])
    )
    return [
      ...Array.from(selectedTopicLevel1IdsSet).map(
        (id) => byId.get(id)
      ),
      ...Array.from(selectedTopicLevel2IdsSet).map(
        (id) => byId.get(id)
      ),
      ...(selectedTopicId == null
        ? []
        : [byId.get(selectedTopicId)])
    ]
      .filter(Boolean)
      .map((topic) => topic!.name)
  }, [
    selectedTopicLevel1IdsSet,
    selectedTopicLevel2IdsSet,
    topics,
    selectedTopicId
  ])
  const visibleSubjects = useMemo(
    () =>
      subjects.filter((subject) =>
        allowedTopicsList.some(
          (topic) => topic.subject_id === subject.id
        )
      ),
    [subjects, allowedTopicsList]
  )
  const subjectMap = useMemo(
    () =>
      new Map(subjects.map((subject) => [
        subject.id,
        subject
      ])),
    [subjects]
  )
  const subjectRootTopicsMap = useMemo(() => {
    const map = new Map<number, Topic[]>()

    for (const topic of allowedTopicsList) {
      if (topic.parent_topic_id != null) {
        continue
      }

      const topics =
        map.get(topic.subject_id) ?? []
      topics.push(topic)
      map.set(topic.subject_id, topics)
    }

    return map
  }, [allowedTopicsList])
  const topicChildrenByParent = useMemo(() => {
    const map = new Map<
      number | null,
      Topic[]
    >()

    for (const topic of allowedTopicsList) {
      const parentId =
        topic.parent_topic_id ?? null
      const siblings =
        map.get(parentId) ?? []

      siblings.push(topic)
      map.set(parentId, siblings)
    }

    return map
  }, [allowedTopicsList])
  const topicDepthMap = useMemo(() => {
    const depthMap = new Map<number, number>()

    function visit(topic: Topic, depth: number) {
      depthMap.set(topic.id, depth)

      const children =
        topicChildrenByParent.get(topic.id) ?? []

      for (const child of children) {
        visit(child, depth + 1)
      }
    }

    for (const topic of allowedTopicsList) {
      if (topic.parent_topic_id == null) {
        visit(topic, 0)
      }
    }

    return depthMap
  }, [allowedTopicsList, topicChildrenByParent])
  const topicSelectionStatus = useMemo(() => {
    const status: Record<
      number,
      "selected" | "partial" | "none"
    > = {}

    function calculate(
      topic: Topic
    ): "selected" | "partial" | "none" {
      if (status[topic.id]) {
        return status[topic.id]
      }

      const children =
        topicChildrenByParent.get(topic.id) ?? []
      const childStatuses = children.map(
        (child) => calculate(child)
      )
      const hasSelectedChild = childStatuses.some(
        (childStatus) =>
          childStatus !== "none"
      )
      const hasUnselectedChild =
        children.length > 0 &&
        childStatuses.some(
          (childStatus) =>
            childStatus === "none"
        )

      const selfSelected =
        selectedTopicIdsSet.has(topic.id)

      if (selfSelected) {
        if (hasUnselectedChild) {
          status[topic.id] = "partial"
          return "partial"
        }

        status[topic.id] = "selected"
        return "selected"
      }

      if (hasSelectedChild) {
        status[topic.id] = "partial"
        return "partial"
      }

      status[topic.id] = "none"
      return "none"
    }

    for (const topic of allowedTopicsList) {
      if (!status[topic.id]) {
        calculate(topic)
      }
    }

    return status
  }, [
    allowedTopicsList,
    selectedTopicIdsSet,
    topicChildrenByParent
  ])
  const selectedSubjectsList = useMemo(
    () =>
      Array.from(selectedSubjectIdsSet)
        .map((subjectId) => subjectMap.get(subjectId))
        .filter(Boolean)
        .map((subject) => subject!.name),
    [selectedSubjectIdsSet, subjectMap]
  )
  const subjectSelectionStatus = useMemo(() => {
    const status: Record<
      number,
      "selected" | "partial" | "none"
    > = {}

    for (const subject of visibleSubjects) {
      const subjectTopics =
        allowedTopicsList.filter(
          (topic) =>
            topic.subject_id === subject.id
        )

      const anySelected =
        subjectTopics.some(
          (topic) =>
            topicSelectionStatus[topic.id] !== "none"
        )

      const allSelected =
        subjectTopics.length > 0 &&
        subjectTopics.every(
          (topic) =>
            topicSelectionStatus[topic.id] ===
            "selected"
        )

      const selfSelected =
        selectedSubjectIdsSet.has(subject.id)

      if (selfSelected) {
        status[subject.id] = "selected"
      } else if (allSelected && subjectTopics.length > 0) {
        status[subject.id] = "selected"
      } else if (anySelected) {
        status[subject.id] = "partial"
      } else {
        status[subject.id] = "none"
      }
    }

    return status
  }, [
    allowedTopicsList,
    topicSelectionStatus,
    visibleSubjects,
    selectedSubjectIdsSet
  ])

  const collectDescendantTopicIds = useCallback(
    (rootId: number) => {
      const ids: number[] = []
      const stack = [rootId]

      while (stack.length > 0) {
        const current = stack.pop()!
        ids.push(current)

        const children =
          topicChildrenByParent.get(current) ?? []

        for (const child of children) {
          stack.push(child.id)
        }
      }

      return ids
    },
    [topicChildrenByParent]
  )

  const cascadeTopicSelection = useCallback(
    async (
      topicId: number,
      select: boolean,
      includeRoot = true
    ) => {
      const ids = collectDescendantTopicIds(
        topicId
      )

      if (!includeRoot) {
        ids.shift()
      }

      for (const id of ids) {
        const depth =
          topicDepthMap.get(id) ?? 0
        const levelIndex =
          depth === 0 ? 0 : 1
        const currentlySelected =
          selectedTopicIdsSet.has(id)

        if (currentlySelected === select) {
          continue
        }

        await toggleTopicSelection(levelIndex, id)
      }
    },
    [
      collectDescendantTopicIds,
      selectedTopicIdsSet,
      topicDepthMap,
      toggleTopicSelection
    ]
  )

  const cascadeSubjectTopicSelection = useCallback(
    async (subjectId: number, select: boolean) => {
      const roots =
        subjectRootTopicsMap.get(subjectId) ?? []

      for (const root of roots) {
        await cascadeTopicSelection(
          root.id,
          select
        )
      }
    },
    [
      subjectRootTopicsMap,
      cascadeTopicSelection
    ]
  )

  const handleSubjectPress = useCallback(
    async (subjectId: number) => {
      const isActive = activeSubjectId === subjectId
      console.log("[topics-click] subject", {
        subjectId,
        isActive,
        selectedSubjectIds: Array.from(
          selectedSubjectIdsSet
        )
      })

      if (!isActive) {
        setActiveSubjectId(subjectId)
        setActiveTopicPath([])
        return
      }

      const shouldSelect =
        !selectedSubjectIdsSet.has(subjectId)

      await toggleSubjectSelection(subjectId)
      await cascadeSubjectTopicSelection(
        subjectId,
        shouldSelect
      )
    },
    [
      activeSubjectId,
      selectedSubjectIdsSet,
      toggleSubjectSelection,
      cascadeSubjectTopicSelection
    ]
  )
  const handleTopicPress = useCallback(
    async (levelIndex: number, topicId: number) => {
      const isActive =
        activeTopicPath[levelIndex] === topicId
      console.log("[topics-click] topic", {
        levelIndex,
        topicId,
        isActive,
        selectedTopicIds: Array.from(
          selectedTopicIdsSet
        )
      })

      if (!isActive) {
        setActiveTopicPath((current) => {
          const next = current.slice(0, levelIndex)
          next[levelIndex] = topicId
          return next
        })
        return
      }

      const shouldSelect =
        !selectedTopicIdsSet.has(topicId)

      await toggleTopicSelection(levelIndex, topicId)
      const hasChildren =
        (topicChildrenByParent.get(topicId) ?? [])
          .length > 0

      if (hasChildren) {
        await cascadeTopicSelection(
          topicId,
          shouldSelect,
          false
        )
      }
    },
    [
      activeTopicPath,
      selectedTopicIdsSet,
      toggleTopicSelection,
      cascadeTopicSelection,
      topicChildrenByParent
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
      if (activeSubjectId != null) {
        setActiveSubjectId(null)
      }

      if (activeTopicPath.length > 0) {
        setActiveTopicPath([])
      }
    }

  }, [
    visibleSubjects,
    selectedSubjectId,
    activeSubjectId,
    activeTopicPath.length
  ])

  useEffect(() => {
    if (
      activeTopicPath.length === 0 &&
      selectedTopicId != null
    ) {
      setActiveTopicPath(
        lineage.map((topic) => topic.id)
      )
    }
  }, [activeTopicPath.length, lineage, selectedTopicId])

  useEffect(() => {
    if (
      selectedSubjectId != null &&
      activeSubjectId !== selectedSubjectId
    ) {
      setActiveSubjectId(selectedSubjectId)
    }
  }, [
    selectedSubjectId,
    activeSubjectId
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

  const activeSubjectName =
    visibleSubjects.find(
      (subject) =>
        subject.id === navigationSubjectId
    )?.name ?? null
  const activePathNames =
    activeTopicPath
      .map((topicId) =>
        topics.find((topic) => topic.id === topicId)
      )
      .filter(Boolean)
      .map((topic) => topic!.name)
  const pathText =
    activeSubjectName != null
      ? [activeSubjectName, ...activePathNames]
          .filter(Boolean)
          .join(" -> ") || "Choose a topic"
      : "Activate a subject first"
  const topicLevels: Topic[][] = []

  if (navigationSubjectId != null) {
    let parentId: number | null = null

    for (let levelIndex = 0; ; levelIndex++) {
      const levelTopics = allowedTopicsList.filter(
        (topic) =>
          topic.subject_id === navigationSubjectId &&
          topic.parent_topic_id === parentId
      )

      if (levelTopics.length === 0) {
        break
      }

      topicLevels.push(levelTopics)

      const nextActiveId =
        activeTopicPath[levelIndex] ?? null

      if (nextActiveId == null) {
        break
      }

      parentId = nextActiveId
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
          Green means selected, white means deselected, yellow means only part of the branch is selected, and the blue border shows the path you are navigating.
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
              const subjectStatus =
                subjectSelectionStatus[subject.id] ?? "none"
              const isSelectedById =
                selectedSubjectIdsSet.has(subject.id)
              const chipVisual =
                getChipVisualStyles(
                  subjectStatus,
                  activeSubjectId === subject.id,
                  isSelectedById
                )

              return (
                <Pressable
                  key={subject.id}
                  style={chipVisual.container}
                  onPress={() =>
                    handleSubjectPress(subject.id)
                  }
                >
                  <Text style={chipVisual.text}>
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

          {navigationSubjectId == null ? (
            <Text
              style={[
                styles.helperText,
                { color: colors.muted }
              ]}
            >
              Activate a subject first.
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
                      const topicStatus =
                        topicSelectionStatus[
                          topic.id
                        ] ?? "none"
                      const chipVisual =
                        getChipVisualStyles(
                          topicStatus,
                          activeTopicPath[levelIndex] ===
                            topic.id
                        )

                      return (
                        <Pressable
                          key={topic.id}
                          style={chipVisual.container}
                          onPress={() =>
                            handleTopicPress(
                              levelIndex,
                              topic.id
                            )
                          }
                        >
                          <Text style={chipVisual.text}>
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
            Subjects:{" "}
            {selectedSubjectsList.length > 0
              ? selectedSubjectsList.join(", ")
              : "Not selected"}
          </Text>

          <Text
            style={[
              styles.summaryText,
              { color: colors.text }
            ]}
          >
            Topics:{" "}
            {selectedTopicsSort.length > 0
              ? selectedTopicsSort.join(", ")
              : "Not selected"}
          </Text>

          <Text
            style={[
              styles.helperText,
              { color: colors.muted }
            ]}
          >
            Path: {pathText}
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
    backgroundColor: "#16a34a",
    borderColor: "#ffffff"
  },

  partialChip: {
    backgroundColor: "#fde68a",
    borderColor: "#dbe4f0",
    borderWidth: 2
  },

  activeChip: {
    borderColor: "#0ea5e9",
    borderWidth: 3
  },

  learningChip: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
    borderWidth: 2
  },

  chipText: {
    color: "#1e3a5f",
    fontWeight: "700"
  },

  allowedChipText: {
    color: "#ffffff"
  },

  learningChipText: {
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

function getChipVisualStyles(
  status: "selected" | "partial" | "none",
  isActive: boolean,
  forceSelected = false
) {
  const isSelected =
    forceSelected || status === "selected"
  const isPartial = status === "partial"

  return {
    container: [
      styles.chip,
      isPartial && styles.partialChip,
      isSelected && !isPartial && styles.learningChip,
      isActive && styles.activeChip
    ],
    text: [
      styles.chipText,
      isSelected && !isPartial && styles.learningChipText
    ]
  }

}
