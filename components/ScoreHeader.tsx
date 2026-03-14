import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle
} from "react-native"

interface Props {
  attempts: number
  correct: number
  accuracy?: number
  containerStyle?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
  valueStyle?: StyleProp<TextStyle>
}

export default function ScoreHeader({
  attempts,
  correct,
  accuracy,
  containerStyle,
  labelStyle,
  valueStyle
}: Props) {

  const acc =
    accuracy !== undefined
      ? accuracy
      : attempts === 0
      ? 0
      : Math.round((correct / attempts) * 100)

  return (

    <View style={[styles.container, containerStyle]}>

      <View style={styles.scoreBlock}>
        <Text style={[styles.label, labelStyle]}>Score</Text>
        <Text style={[styles.value, valueStyle]}>
          {correct} / {attempts}
        </Text>
      </View>

      <View style={styles.scoreBlock}>
        <Text style={[styles.label, labelStyle]}>Accuracy</Text>
        <Text style={[styles.value, valueStyle]}>
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
