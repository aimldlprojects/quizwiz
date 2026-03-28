// components/AnswerActions.tsx

import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import {
  ActivityIndicator,
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
  onSync: () => void
  syncTone: string
  syncNeedsAttention: boolean
  syncing: boolean
  colors: ThemeColors
}

export default function AnswerActions({
  answered,
  onSubmit,
  onNext,
  onSync,
  syncTone,
  syncNeedsAttention,
  syncing,
  colors
}: Props) {

  return (
    <View style={styles.container}>
      <View style={styles.row}>
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

        <Pressable
          style={[
            styles.syncButton,
            {
              borderColor: syncTone,
              backgroundColor: syncNeedsAttention
                ? "rgba(245, 158, 11, 0.12)"
                : colors.surface
            }
          ]}
          onPress={onSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator
              size="small"
              color={syncTone}
            />
          ) : (
            <MaterialIcons
              name="sync"
              size={22}
              color={syncTone}
            />
          )}
        </Pressable>
      </View>
    </View>
  )

}

const styles = StyleSheet.create({

  container: {
    marginTop: 20
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },

  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2
  },

  syncButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },

  buttonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16
  }

})
