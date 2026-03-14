// components/FlashCard.tsx

import { useEffect, useState } from "react"
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
  type TextStyle
} from "react-native"

import type { ThemeColors } from "../styles/theme"

interface Props {
  question: string
  answer: string
  revealed?: boolean
  onToggle?: (revealed: boolean) => void
  colors?: ThemeColors
}

export default function FlashCard({
  question,
  answer,
  revealed,
  onToggle,
  colors
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

  const cardStyle: ViewStyle[] = [
    styles.card,
    colors
      ? {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1
        }
      : {}
  ]

  const labelStyle: TextStyle = {
    color: colors?.muted ?? "#666"
  }

  const questionStyle: TextStyle = {
    color: colors?.text ?? "#000"
  }

  const answerStyle: TextStyle = {
    color: colors?.iconActive ?? "#2e7d32"
  }

  const hintStyle: TextStyle = {
    color: colors?.muted ?? "#888"
  }

  return (

    <TouchableOpacity
      style={cardStyle}
      activeOpacity={0.9}
      onPress={toggleCard}
    >

      {!isRevealed ? (

        <View style={styles.content}>
          <Text style={[styles.label, labelStyle]}>
            Question
          </Text>

          <Text
            style={[
              styles.question,
              questionStyle
            ]}
          >
            {question}
          </Text>

          <Text
            style={[
              styles.tapHint,
              hintStyle
            ]}
          >
            Tap to reveal answer
          </Text>
        </View>

      ) : (

        <View style={styles.content}>

          <Text style={[styles.label, labelStyle]}>
            Answer
          </Text>

          <Text
            style={[
              styles.answer,
              answerStyle
            ]}
          >
            {answer}
          </Text>

          <Text
            style={[
              styles.tapHint,
              hintStyle
            ]}
          >
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
