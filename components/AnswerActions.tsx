// components/AnswerActions.tsx

import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native"
import type { ThemeColors } from "../styles/theme"

interface Props {
  answered: boolean
  onSubmit: () => void
  onNext: () => void
  colors: ThemeColors
}

export default function AnswerActions({
  answered,
  onSubmit,
  onNext,
  colors
}: Props) {

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.button,
          {
            backgroundColor:
              colors.iconActive,
            borderColor: colors.border
          }
        ]}
        onPress={answered ? onNext : onSubmit}
      >
        <Text style={styles.buttonText}>
          {answered
            ? "Next Question"
            : "Submit Answer"}
        </Text>
      </Pressable>
    </View>
  )

}

const styles = StyleSheet.create({

  container: {
    marginTop: 20
  },

  button: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2
  },

  buttonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16
  }

})
