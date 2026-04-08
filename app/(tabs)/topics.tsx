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

import { useDatabase } from "../../hooks/useDatabase"
import { useDeviceRegistry } from "../../hooks/useDeviceRegistry"
import { useSettings } from "../../hooks/useSettings"
import { useStudyPreferences } from "../../hooks/useStudyPreferences"
import { getAllTopics } from "../../database/contentRepository"
import { useUsers } from "../../hooks/useUsers"
import { UserSubjectRepository } from "../../database/userSubjectRepository"
import { subscribePermissionMetaChanges } from "../../database/syncMetaRepository"
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
    activeUser,
    scopedDeviceKey
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
        ...selectedTopicLevel2Ids
      ]),
    [
      selectedTopicLevel1Ids,
      selectedTopicLevel2Ids
    ]
  )

  const [subjects, setSubjects] =
    useState<Subject[]>([])
  const [topics, setTopics] =
    useState<Topic[]>([])
  const [allowedTopicIds, setAllowedTopicIds] =
    useState<Set<number>>(new Set())
  const [activeSubjectId, setActiveSubjectId] =
    useState<number | null>(null)
  const [activeTopicPath, setActiveTopicPath] =
    useState<number[]>([])
  const navigationSubjectId =
    activeSubjectId ??
    selectedSubjectId
  const previousNavigationSubjectId =
    useRef<number | null>(null)
  const hadSelectedSelectionRef =
    useRef(false)

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

      setSubjects(loadedSubjects)
      setTopics(loadedTopics)
      setAllowedTopicIds(
        new Set(
          allowedTopics.map((topic) => topic.id)
        )
      )

    }

    loadOptions()

  }, [db, activeUser])

  useEffect(() => {
    if (!db || !activeUser) {
      return
    }

    const reload = () => {
      void (async () => {
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

        setSubjects(loadedSubjects)
        setTopics(loadedTopics)
        setAllowedTopicIds(
          new Set(
            allowedTopics.map((topic) => topic.id)
          )
        )
      })()
    }

    return subscribePermissionMetaChanges(
      reload
    )
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

  useEffect(() => {
    const hasSelection =
      selectedSubjectId != null ||
      selectedTopicId != null ||
      selectedSubjectIds.length > 0 ||
      selectedTopicLevel1Ids.length > 0 ||
      selectedTopicLevel2Ids.length > 0

    if (
      !hasSelection &&
      hadSelectedSelectionRef.current
    ) {
      setActiveSubjectId(null)
      setActiveTopicPath([])
    }

    hadSelectedSelectionRef.current = hasSelection
  }, [
    selectedSubjectId,
    selectedTopicId,
    selectedSubjectIds.length,
    selectedTopicLevel1Ids.length,
    selectedTopicLevel2Ids.length
  ])

  const displayedActiveTopicPath =
    activeTopicPath
  const allowedTopicsList = useMemo(
    () => {
      const byId = new Map(
        topics.map((topic) => [topic.id, topic])
      )
      const visibleTopicIds = new Set<number>()

      for (const topic of topics) {
        if (!allowedTopicIds.has(topic.id)) {
          continue
        }

        let current: typeof topic | undefined = topic
        while (current) {
          if (visibleTopicIds.has(current.id)) {
            break
          }

          visibleTopicIds.add(current.id)
          if (current.parent_topic_id == null) {
            break
          }

          current = byId.get(current.parent_topic_id)
        }
      }

      return topics.filter((topic) =>
        visibleTopicIds.has(topic.id)
      )
    },
    [topics, allowedTopicIds]
  )
  const displayTopicsList = useMemo(
    () => allowedTopicsList,
    [allowedTopicsList]
  )
  const selectedTopicsSort = useMemo(() => {
    const visibleTopicIds = new Set(
      displayTopicsList.map((topic) => topic.id)
    )
    const byId = new Map(
      displayTopicsList.map((topic) => [
        topic.id,
        topic
      ])
    )
    const orderedIds = [
      ...Array.from(selectedTopicLevel1IdsSet),
      ...Array.from(selectedTopicLevel2IdsSet)
    ]

    return Array.from(new Set(orderedIds))
      .filter((id) => visibleTopicIds.has(id))
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((topic) => topic!.name)
  }, [
    displayTopicsList,
    selectedTopicLevel1IdsSet,
    selectedTopicLevel2IdsSet
  ])
  const visibleSubjects = useMemo(
    () =>
      subjects.filter((subject) =>
        displayTopicsList.some(
          (topic) => topic.subject_id === subject.id
        )
      ),
    [subjects, displayTopicsList]
  )
  const renderNavigationSubjectId = useMemo(
    () => {
      if (
        activeSubjectId != null &&
        displayTopicsList.some(
          (topic) =>
            topic.subject_id === activeSubjectId
        )
      ) {
        return activeSubjectId
      }

      if (
        selectedSubjectId != null &&
        displayTopicsList.some(
          (topic) =>
            topic.subject_id === selectedSubjectId
        )
      ) {
        return selectedSubjectId
      }

      return null
    },
    [activeSubjectId, displayTopicsList, selectedSubjectId]
  )
  const renderSubjectTopics = useMemo(
    () =>
      renderNavigationSubjectId == null
        ? []
        : displayTopicsList.filter(
            (topic) =>
              topic.subject_id ===
              renderNavigationSubjectId
          ),
    [displayTopicsList, renderNavigationSubjectId]
  )
  const renderRootTopics = useMemo(
    () =>
      renderSubjectTopics.filter(
        (topic) => topic.parent_topic_id == null
      ),
    [renderSubjectTopics]
  )
  const topicLevels = useMemo(() => {
    const levels: Topic[][] = []

    if (renderNavigationSubjectId == null) {
      return levels
    }

    const renderTopicPath = activeTopicPath
    const fallbackTopics =
      renderRootTopics.length > 0
        ? renderRootTopics
        : renderSubjectTopics
    let parentId: number | null = null

    for (let levelIndex = 0; ; levelIndex++) {
      const levelTopics =
        levelIndex === 0 &&
        renderRootTopics.length === 0
          ? fallbackTopics
          : displayTopicsList.filter(
              (topic) =>
                topic.subject_id ===
                  renderNavigationSubjectId &&
                topic.parent_topic_id === parentId
            )

      if (levelTopics.length === 0) {
        break
      }

      levels.push(levelTopics)

      const nextActiveId =
        renderTopicPath[levelIndex] ?? null

      if (nextActiveId == null) {
        break
      }

      parentId = nextActiveId
    }

    return levels
  }, [
    activeTopicPath,
    displayTopicsList,
    renderNavigationSubjectId,
    renderRootTopics,
    renderSubjectTopics
  ])

  const subjectMap = useMemo(
    () =>
      new Map(subjects.map((subject) => [
        subject.id,
        subject
      ])),
    [subjects]
  )
  const topicChildrenByParent = useMemo(() => {
    const map = new Map<
      number | null,
      Topic[]
    >()

    for (const topic of displayTopicsList) {
      const parentId =
        topic.parent_topic_id ?? null
      const siblings =
        map.get(parentId) ?? []

      siblings.push(topic)
      map.set(parentId, siblings)
    }

    return map
  }, [displayTopicsList])
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

    for (const topic of displayTopicsList) {
      if (topic.parent_topic_id == null) {
        visit(topic, 0)
      }
    }

    return depthMap
  }, [displayTopicsList, topicChildrenByParent])
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

      const selfSelected =
        selectedTopicIdsSet.has(topic.id)

      if (selfSelected) {
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

    for (const topic of displayTopicsList) {
      if (!status[topic.id]) {
        calculate(topic)
      }
    }

    return status
  }, [
    displayTopicsList,
    selectedTopicIdsSet,
    topicChildrenByParent
  ])
  const selectedSubjectsList = useMemo(
    () => {
      const visibleSubjectIds = new Set(
        visibleSubjects.map((subject) => subject.id)
      )

      return Array.from(selectedSubjectIdsSet)
        .filter((subjectId) =>
          visibleSubjectIds.has(subjectId)
        )
        .map((subjectId) => subjectMap.get(subjectId))
        .filter(Boolean)
        .map((subject) => subject!.name)
    },
    [
      selectedSubjectIdsSet,
      subjectMap,
      visibleSubjects
    ]
  )
  const subjectSelectionStatus = useMemo(() => {
    const status: Record<
      number,
      "selected" | "partial" | "none"
    > = {}

    for (const subject of visibleSubjects) {
      const subjectTopics =
        displayTopicsList.filter(
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
    displayTopicsList,
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
      toggleTopicSelection,
      topicDepthMap
    ]
  )

  const cascadeSubjectTopicSelection = useCallback(
    async (subjectId: number, select: boolean) => {
      const subjectTopics = displayTopicsList
        .filter((topic) => topic.subject_id === subjectId)
        .sort((a, b) => {
          const depthA =
            topicDepthMap.get(a.id) ??
            (a.parent_topic_id == null ? 0 : 1)
          const depthB =
            topicDepthMap.get(b.id) ??
            (b.parent_topic_id == null ? 0 : 1)
          return depthA - depthB
        })

      for (const topic of subjectTopics) {
        const currentlySelected =
          selectedTopicIdsSet.has(topic.id)
        if (currentlySelected === select) {
          continue
        }

        const levelIndex =
          topic.parent_topic_id == null ? 0 : 1
        await toggleTopicSelection(
          levelIndex,
          topic.id
        )
      }
    },
    [
      displayTopicsList,
      selectedTopicIdsSet,
      toggleTopicSelection,
      topicDepthMap
    ]
  )

  const handleSubjectPress = useCallback(
    async (subjectId: number) => {
      const isActive = activeSubjectId === subjectId
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
      topicChildrenByParent,
      cascadeTopicSelection
    ]
  )
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
          Loading learning path...
        </Text>
      </SafeAreaView>
    )
  }

  const activeSubjectName =
    visibleSubjects.find(
      (subject) =>
        subject.id === renderNavigationSubjectId
    )?.name ?? null
  const activePathNames =
    displayedActiveTopicPath
      .map((topicId) =>
        topics.find((topic) => topic.id === topicId)
      )
      .filter(Boolean)
      .map((topic) => topic!.name)
  const pathText =
    activeSubjectName != null
      ? activePathNames.length > 0
        ? [activeSubjectName, ...activePathNames]
            .filter(Boolean)
            .join(" -> ")
        : activeSubjectName
      : "Select any subject to show topics"

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
          Green means selected, white means deselected, blue means only part of the branch is selected, and the strong blue border shows the path you are navigating.
        </Text>

        {activeUser && visibleSubjects.length === 0 ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>
              No permitted subjects
            </Text>

            <Text style={styles.noticeText}>
              Ask the admin to enable at least one subject/topic for this user.
            </Text>
          </View>
        ) : renderNavigationSubjectId == null ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>
              Select a subject
            </Text>

            <Text style={styles.noticeText}>
              Pick any subject above to reveal the available topics for this user.
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
            <View style={styles.noticeCard}>
              <View style={styles.noticeIcon}>
                <MaterialIcons
                  name="category"
                  size={20}
                  color="#ffffff"
                />
              </View>

              <Text style={styles.noticeTitle}>
                Select a subject
              </Text>

              <Text style={styles.noticeText}>
                Tap any subject above to reveal the available topics for this user.
              </Text>
            </View>
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
                          displayedActiveTopicPath[levelIndex] ===
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
    backgroundColor: "#eff6ff",
    borderRadius: 22,
    padding: 18
  },

  noticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    marginBottom: 10
  },

  noticeTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1d4ed8",
    marginBottom: 6
  },

  noticeText: {
    color: "#1e40af",
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
    borderColor: "#cbd5e1"
  },

  allowedChip: {
    backgroundColor: "#16a34a",
    borderColor: "#ffffff"
  },

  partialChip: {
    backgroundColor: "#93c5fd",
    borderColor: "#2563eb",
    borderWidth: 2
  },

  activeChip: {
    borderColor: "#0284c7",
    borderWidth: 3
  },

  learningChip: {
    backgroundColor: "#22c55e",
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
