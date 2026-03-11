// components/AnswerActions.tsx

import { Button, StyleSheet, View } from "react-native"
import { ReviewRating } from "../engine/scheduler/spacedRepetition"

interface Props {

  answered: boolean

  onSubmit: () => void
  onNext: () => void

  onRate: (rating: ReviewRating) => void
}

export default function AnswerActions({

  answered,
  onSubmit,
  onNext,
  onRate

}: Props) {

  if (!answered) {

    return (
      <View style={styles.container}>

        <Button
          title="Submit"
          onPress={onSubmit}
        />

      </View>
    )

  }

  return (

    <View style={styles.container}>

      <View style={styles.ratingRow}>

        <Button
          title="Again"
          onPress={() => onRate("again")}
        />

        <Button
          title="Hard"
          onPress={() => onRate("hard")}
        />

        <Button
          title="Good"
          onPress={() => onRate("good")}
        />

        <Button
          title="Easy"
          onPress={() => onRate("easy")}
        />

      </View>

      <View style={styles.nextRow}>

        <Button
          title="Next Question"
          onPress={onNext}
        />

      </View>

    </View>

  )

}

const styles = StyleSheet.create({

  container: {
    marginTop: 20
  },

  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },

  nextRow: {
    alignItems: "center"
  }

})