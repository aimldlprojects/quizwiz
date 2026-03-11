import { StyleSheet, Text, View } from "react-native"

interface Props {
  attempts: number
  correct: number
  accuracy?: number
}

export default function ScoreHeader({
  attempts,
  correct,
  accuracy
}: Props) {

  const acc =
    accuracy !== undefined
      ? accuracy
      : attempts === 0
      ? 0
      : Math.round((correct / attempts) * 100)

  return (

    <View style={styles.container}>

      <View style={styles.scoreBlock}>
        <Text style={styles.label}>Score</Text>
        <Text style={styles.value}>
          {correct} / {attempts}
        </Text>
      </View>

      <View style={styles.scoreBlock}>
        <Text style={styles.label}>Accuracy</Text>
        <Text style={styles.value}>
          {acc}%
        </Text>
      </View>

    </View>

  )
}

const styles = StyleSheet.create({

  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    padding: 12,
    marginBottom: 10,

    backgroundColor: "#ffffff",
    borderRadius: 10,

    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,

    elevation: 2
  },

  scoreBlock: {
    alignItems: "center"
  },

  label: {
    fontSize: 12,
    color: "#777"
  },

  value: {
    fontSize: 18,
    fontWeight: "600"
  }

})