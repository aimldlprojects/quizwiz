// components/HomeStats.tsx

import { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { StatsRepository } from "../database/statsRepository"

interface Props {
  statsRepo: StatsRepository
  userId: number
}

export default function HomeStats({
  statsRepo,
  userId
}: Props) {

  const [accuracy, setAccuracy] = useState(0)
  const [dueReviews, setDueReviews] = useState(0)
  const [topics, setTopics] = useState<any[]>([])

  useEffect(() => {
    async function loadStats() {
      const acc = await statsRepo.getAccuracy(userId)
      const due =
        await statsRepo.getDueReviewCount(userId)
      const topicProgress =
        await statsRepo.getTopicProgress(userId)

      setAccuracy(acc)
      setDueReviews(due)
      setTopics(topicProgress)
    }

    void loadStats()
  }, [statsRepo, userId])

  return (

    <View style={styles.container}>

      <Text style={styles.title}>Your Progress</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Accuracy</Text>
        <Text style={styles.value}>{accuracy}%</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Due Reviews</Text>
        <Text style={styles.value}>{dueReviews}</Text>
      </View>

      <Text style={styles.subtitle}>Topics</Text>

      {topics.map((t) => (

        <View key={t.topicId} style={styles.topicRow}>

          <Text style={styles.topicName}>
            {t.topicName}
          </Text>

          <Text style={styles.topicProgress}>
            {t.progress}%
          </Text>

        </View>

      ))}

    </View>

  )
}

const styles = StyleSheet.create({

  container: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginVertical: 10
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10
  },

  subtitle: {
    marginTop: 10,
    fontWeight: "600"
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4
  },

  label: {
    fontSize: 14
  },

  value: {
    fontSize: 14,
    fontWeight: "600"
  },

  topicRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6
  },

  topicName: {
    fontSize: 14
  },

  topicProgress: {
    fontSize: 14,
    fontWeight: "600"
  }

})
