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
  onNext

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

  nextRow: {
    alignItems: "center"
  }

})
