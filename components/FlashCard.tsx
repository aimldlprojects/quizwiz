// components/FlashCard.tsx

import { useEffect, useState } from "react"
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native"

interface Props {
  question: string
  answer: string
  revealed?: boolean
  onToggle?: (revealed: boolean) => void
}

export default function FlashCard({
  question,
  answer,
  revealed,
  onToggle
}: Props) {

  const [internalRevealed, setInternalRevealed] =
    useState(false)

  const isControlled =
    typeof revealed === "boolean"
  const isRevealed =
    isControlled
      ? revealed
      : internalRevealed

  useEffect(() => {
    if (!isControlled) {
      setInternalRevealed(false)
    }
  }, [question, isControlled])

  function toggleCard() {
    const nextValue = !isRevealed

    if (!isControlled) {
      setInternalRevealed(nextValue)
    }

    onToggle?.(nextValue)
  }

  return (

    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={toggleCard}
    >

      {!isRevealed ? (

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
