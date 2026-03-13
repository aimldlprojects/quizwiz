import { useEffect, useState } from "react"
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

type Subject = {
  id: number
  name: string
}

type Topic = {
  id: number
  name: string
  subject_id: number
  parent_topic_id: number | null
}

export default function TopicsScreen() {

  const { db, loading } = useDatabase()
  const {
    selectedSubjectId,
    selectedTopicId,
    setSelectedSubjectId,
    setSelectedTopicId,
    loading: preferencesLoading
  } = useStudyPreferences(db)

  const [subjects, setSubjects] =
    useState<Subject[]>([])
  const [topics, setTopics] =
    useState<Topic[]>([])

  useEffect(() => {

    async function loadOptions() {

      if (!db) return

      const loadedSubjects =
        await db.getAllAsync<Subject>(
          `
          SELECT id, name
          FROM subjects
          ORDER BY name
          `
        )

      const loadedTopics =
        await db.getAllAsync<Topic>(
          `
          SELECT
            id,
            name,
            subject_id,
            parent_topic_id
          FROM topics
          ORDER BY name
          `
        )

      setSubjects(loadedSubjects)
      setTopics(loadedTopics)

    }

    loadOptions()

  }, [db])

  if (loading || preferencesLoading || !db) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Loading learning path...
        </Text>
      </SafeAreaView>
    )
  }

  const visibleTopics =
    topics.filter(
      (topic) =>
        topic.subject_id ===
          selectedSubjectId &&
        topic.parent_topic_id == null &&
        selectedSubjectId != null
    )

  const selectedTopic =
    topics.find(
      (topic) => topic.id === selectedTopicId
    )

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
      >
        <Text style={styles.title}>
          Choose Subject and Topic
        </Text>

        <Text style={styles.subtitle}>
          Pick what to study before opening
          Learn or Practice.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Subjects
          </Text>

          <View style={styles.chipWrap}>
            {subjects.map((subject) => (
              <Pressable
                key={subject.id}
                style={[
                  styles.chip,
                  selectedSubjectId === subject.id &&
                    styles.selectedChip
                ]}
                onPress={() =>
                  setSelectedSubjectId(subject.id)
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedSubjectId ===
                      subject.id &&
                      styles.selectedChipText
                  ]}
                >
                  {subject.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Topics
          </Text>

          {selectedSubjectId == null ? (
            <Text style={styles.helperText}>
              Select a subject first.
            </Text>
          ) : (
            <View style={styles.chipWrap}>
              {visibleTopics.map((topic) => (
                <Pressable
                  key={topic.id}
                  style={[
                    styles.chip,
                    selectedTopicId === topic.id &&
                      styles.selectedChip
                  ]}
                  onPress={() =>
                    setSelectedTopicId(topic.id)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedTopicId ===
                        topic.id &&
                        styles.selectedChipText
                    ]}
                  >
                    {topic.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>
            Current selection
          </Text>

          <Text style={styles.summaryText}>
            Subject:{" "}
            {subjects.find(
              (subject) =>
                subject.id === selectedSubjectId
            )?.name ?? "Not selected"}
          </Text>

          <Text style={styles.summaryText}>
            Topic:{" "}
            {selectedTopic?.name ?? "Not selected"}
          </Text>

          <Text style={styles.helperText}>
            Subtopics are not populated in the
            current database yet. The selector
            is ready for topic hierarchies once
            that data exists.
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

  chip: {
    backgroundColor: "#eff6ff",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10
  },

  selectedChip: {
    backgroundColor: "#2563eb"
  },

  chipText: {
    color: "#1e3a5f",
    fontWeight: "700"
  },

  selectedChipText: {
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
