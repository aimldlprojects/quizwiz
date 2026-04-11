import { ActivityIndicator, StyleSheet, Text, View } from "react-native"

type ThemeColors = {
  background: string
  card: string
  border: string
  text: string
  muted: string
}

type Props = {
  colors: ThemeColors
  title: string
  stageLabel?: string
  progressPercent?: number
  message?: string | null
  messageColor?: string
  compact?: boolean
}

export default function BootstrapLoadingCard({
  colors,
  title,
  stageLabel,
  progressPercent,
  message,
  messageColor,
  compact = false
}: Props) {

  const progress = Math.min(
    Math.max(progressPercent ?? 0, 0),
    100
  )

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border
        },
        compact && styles.compactCard
      ]}
    >
      <ActivityIndicator color={colors.text} />

      <Text
        style={[
          styles.title,
          { color: colors.text }
        ]}
      >
        {title}
      </Text>

      {stageLabel ? (
        <Text
          style={[
            styles.stage,
            { color: colors.muted }
          ]}
        >
          {stageLabel}
        </Text>
      ) : null}

      {message ? (
        <Text
          style={[
            styles.message,
            {
              color: messageColor ?? colors.muted
            }
          ]}
        >
          {message}
        </Text>
      ) : null}

      {progressPercent != null ? (
        <>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` }
              ]}
            />
          </View>
          <Text
            style={[
              styles.detail,
              { color: colors.muted }
            ]}
          >
            {progress}% complete
          </Text>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6
    },
    elevation: 3,
    alignItems: "center"
  },
  compactCard: {
    maxWidth: 360
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8
  },
  stage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12
  },
  progressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4caf50"
  },
  detail: {
    fontSize: 14,
    textAlign: "center"
  }
})
