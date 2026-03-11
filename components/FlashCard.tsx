// components/FlashCard.tsx

import { useState } from "react"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native"

interface Props {
  question: string
  answer: string
}

export default function FlashCard({
  question,
  answer
}: Props) {

  const [revealed, setRevealed] = useState(false)

  function toggleCard() {
    setRevealed(!revealed)
  }

  function reset() {
    setRevealed(false)
  }

  return (

    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={toggleCard}
    >

      {!revealed ? (

        <View style={styles.content}>
          <Text style={styles.label}>
            Question
          </Text>

          <Text style={styles.question}>
            {question}
          </Text>

          <Text style={styles.tapHint}>
            Tap to reveal answer
          </Text>
        </View>

      ) : (

        <View style={styles.content}>

          <Text style={styles.label}>
            Answer
          </Text>

          <Text style={styles.answer}>
            {answer}
          </Text>

          <Text style={styles.tapHint}>
            Tap to hide
          </Text>

        </View>

      )}

    </TouchableOpacity>

  )
}

const styles = StyleSheet.create({

  card: {

    backgroundColor: "#ffffff",
    borderRadius: 16,

    padding: 24,
    marginVertical: 20,

    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,

    elevation: 3,
    alignItems: "center",
    justifyContent: "center"

  },

  content: {
    alignItems: "center"
  },

  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10
  },

  question: {
    fontSize: 28,
    fontWeight: "600"
  },

  answer: {
    fontSize: 30,
    fontWeight: "700",
    color: "#2e7d32"
  },

  tapHint: {
    marginTop: 15,
    fontSize: 12,
    color: "#888"
  }

})