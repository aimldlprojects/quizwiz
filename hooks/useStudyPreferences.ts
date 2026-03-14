import { SQLiteDatabase } from "expo-sqlite"
import { useFocusEffect } from "@react-navigation/native"
import {
  useCallback,
  useEffect,
  useState
} from "react"

import { ttsService } from "@/services/ttsService"
import type { ThemeMode } from "@/styles/theme"

type Preferences = {
  selectedSubjectId: number | null
  selectedTopicId: number | null
  ttsEnabled: boolean
  autoNextEnabled: boolean
  autoNextCorrectDelaySeconds: number
  autoNextWrongDelaySeconds: number
  learnAutoPlayEnabled: boolean
  learnFrontDelaySeconds: number
  learnBackDelaySeconds: number
  learnRandomOrderEnabled: boolean
  practiceRandomOrderEnabled: boolean
  themeMode: ThemeMode
}

const DEFAULTS: Preferences = {
  selectedSubjectId: null,
  selectedTopicId: null,
  ttsEnabled: true,
  autoNextEnabled: false,
  autoNextCorrectDelaySeconds: 2,
  autoNextWrongDelaySeconds: 5,
  learnAutoPlayEnabled: false,
  learnFrontDelaySeconds: 5,
  learnBackDelaySeconds: 5,
  learnRandomOrderEnabled: false,
  practiceRandomOrderEnabled: false,
  themeMode: "light"
}

export function useStudyPreferences(
  db: SQLiteDatabase | null,
  userId: number | null = null
) {

  const [loading, setLoading] =
    useState(true)
  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULTS)

  useEffect(() => {

    if (!db) return

    load()

  }, [db, userId])

  useFocusEffect(useCallback(() => {

    if (!db) {
      return
    }

    load()
  }, [db, userId]))

  useEffect(() => {

    if (preferences.ttsEnabled) {
      ttsService.enable()
    } else {
      ttsService.disable()
    }

  }, [preferences.ttsEnabled])

  async function load() {

    if (!db) return

    const selectedSubjectKey =
      userId == null
        ? "selected_subject_id"
        : `selected_subject_id_user_${userId}`
    const selectedTopicKey =
      userId == null
        ? "selected_topic_id"
        : `selected_topic_id_user_${userId}`
    const autoNextEnabledKey =
      userId == null
        ? "auto_next_enabled"
        : `auto_next_enabled_user_${userId}`
    const autoNextCorrectDelayKey =
      userId == null
        ? "auto_next_correct_delay_seconds"
        : `auto_next_correct_delay_seconds_user_${userId}`
    const autoNextWrongDelayKey =
      userId == null
        ? "auto_next_wrong_delay_seconds"
        : `auto_next_wrong_delay_seconds_user_${userId}`
    const learnAutoPlayKey =
      userId == null
        ? "learn_auto_play_enabled"
        : `learn_auto_play_enabled_user_${userId}`
    const learnFrontDelayKey =
      userId == null
        ? "learn_front_delay_seconds"
        : `learn_front_delay_seconds_user_${userId}`
    const learnBackDelayKey =
      userId == null
        ? "learn_back_delay_seconds"
        : `learn_back_delay_seconds_user_${userId}`
    const learnRandomOrderKey =
      userId == null
        ? "learn_random_order_enabled"
        : `learn_random_order_enabled_user_${userId}`
    const practiceRandomOrderKey =
      userId == null
        ? "practice_random_order_enabled"
        : `practice_random_order_enabled_user_${userId}`
    const themeModeKey =
      userId == null
        ? "theme_mode"
        : `theme_mode_user_${userId}`
    const rows =
      await db.getAllAsync<{
        key: string
        value: string
      }>(
        `
        SELECT key, value
        FROM settings
        WHERE key = ?
        OR key = ?
        OR key = ?
        OR key = ?
        OR key = ?
        OR key = ?
        OR key = ?
        OR key = ?
        OR key = ?
        OR key = ?
        OR key = ?
        OR key = ?
        `,
        [
          selectedSubjectKey,
          selectedTopicKey,
          "tts_enabled",
          autoNextEnabledKey,
          autoNextCorrectDelayKey,
          autoNextWrongDelayKey,
          learnAutoPlayKey,
          learnFrontDelayKey,
          learnBackDelayKey,
          learnRandomOrderKey,
          practiceRandomOrderKey,
          themeModeKey
        ]
      )

    const next = { ...DEFAULTS }

    for (const row of rows) {
      switch (row.key) {
        case selectedSubjectKey:
          next.selectedSubjectId =
            row.value ? Number(row.value) : null
          break
        case selectedTopicKey:
          next.selectedTopicId =
            row.value ? Number(row.value) : null
          break
        case "tts_enabled":
          next.ttsEnabled = row.value !== "0"
          break
        case autoNextEnabledKey:
          next.autoNextEnabled =
            row.value === "1"
          break
        case autoNextCorrectDelayKey:
          next.autoNextCorrectDelaySeconds =
            Math.max(
              1,
              Number(row.value) ||
                DEFAULTS.autoNextCorrectDelaySeconds
            )
          break
        case autoNextWrongDelayKey:
          next.autoNextWrongDelaySeconds =
            Math.max(
              1,
              Number(row.value) ||
                DEFAULTS.autoNextWrongDelaySeconds
            )
          break
        case learnAutoPlayKey:
          next.learnAutoPlayEnabled =
            row.value === "1"
          break
        case learnFrontDelayKey:
          next.learnFrontDelaySeconds =
            Math.max(
              1,
              Number(row.value) ||
                DEFAULTS.learnFrontDelaySeconds
            )
          break
        case learnBackDelayKey:
          next.learnBackDelaySeconds =
            Math.max(
              1,
              Number(row.value) ||
                DEFAULTS.learnBackDelaySeconds
            )
          break
        case learnRandomOrderKey:
          next.learnRandomOrderEnabled =
            row.value === "1"
          break
        case practiceRandomOrderKey:
          next.practiceRandomOrderEnabled =
            row.value === "1"
          break
        case themeModeKey:
          next.themeMode =
            row.value === "dark"
              ? "dark"
              : "light"
          break
      }
    }

    setPreferences(next)
    setLoading(false)

  }

  async function savePreference(
    key: string,
    value: string | null
  ) {

    if (!db) return

    await db.runAsync(
      `
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key)
      DO UPDATE SET value = excluded.value
      `,
      [key, value]
    )

  }

  async function setSelectedSubjectId(
    subjectId: number | null
  ) {

    setPreferences((current) => ({
      ...current,
      selectedSubjectId: subjectId,
      selectedTopicId: null
    }))

    await savePreference(
      userId == null
        ? "selected_subject_id"
        : `selected_subject_id_user_${userId}`,
      subjectId == null
        ? null
        : String(subjectId)
    )
    await savePreference(
      userId == null
        ? "selected_topic_id"
        : `selected_topic_id_user_${userId}`,
      null
    )

  }

  async function setSelectedTopicId(
    topicId: number | null
  ) {

    setPreferences((current) => ({
      ...current,
      selectedTopicId: topicId
    }))

    await savePreference(
      userId == null
        ? "selected_topic_id"
        : `selected_topic_id_user_${userId}`,
      topicId == null
        ? null
        : String(topicId)
    )

  }

  async function setTtsEnabled(
    enabled: boolean
  ) {

    setPreferences((current) => ({
      ...current,
      ttsEnabled: enabled
    }))

    await savePreference(
      "tts_enabled",
      enabled ? "1" : "0"
    )

  }

  async function setAutoNextEnabled(
    enabled: boolean
  ) {

    setPreferences((current) => ({
      ...current,
      autoNextEnabled: enabled
    }))

    await savePreference(
      userId == null
        ? "auto_next_enabled"
        : `auto_next_enabled_user_${userId}`,
      enabled ? "1" : "0"
    )

  }

  async function setAutoNextCorrectDelaySeconds(
    seconds: number
  ) {

    const nextValue = Math.max(1, seconds)

    setPreferences((current) => ({
      ...current,
      autoNextCorrectDelaySeconds: nextValue
    }))

    await savePreference(
      userId == null
        ? "auto_next_correct_delay_seconds"
        : `auto_next_correct_delay_seconds_user_${userId}`,
      String(nextValue)
    )

  }

  async function setAutoNextWrongDelaySeconds(
    seconds: number
  ) {

    const nextValue = Math.max(1, seconds)

    setPreferences((current) => ({
      ...current,
      autoNextWrongDelaySeconds: nextValue
    }))

    await savePreference(
      userId == null
        ? "auto_next_wrong_delay_seconds"
        : `auto_next_wrong_delay_seconds_user_${userId}`,
      String(nextValue)
    )

  }

  async function setLearnAutoPlayEnabled(
    enabled: boolean
  ) {

    setPreferences((current) => ({
      ...current,
      learnAutoPlayEnabled: enabled
    }))

    await savePreference(
      userId == null
        ? "learn_auto_play_enabled"
        : `learn_auto_play_enabled_user_${userId}`,
      enabled ? "1" : "0"
    )

  }

  async function setLearnFrontDelaySeconds(
    seconds: number
  ) {

    const nextValue = Math.max(1, seconds)

    setPreferences((current) => ({
      ...current,
      learnFrontDelaySeconds: nextValue
    }))

    await savePreference(
      userId == null
        ? "learn_front_delay_seconds"
        : `learn_front_delay_seconds_user_${userId}`,
      String(nextValue)
    )

  }

  async function setLearnBackDelaySeconds(
    seconds: number
  ) {

    const nextValue = Math.max(1, seconds)

    setPreferences((current) => ({
      ...current,
      learnBackDelaySeconds: nextValue
    }))

    await savePreference(
      userId == null
        ? "learn_back_delay_seconds"
        : `learn_back_delay_seconds_user_${userId}`,
      String(nextValue)
    )

  }

  async function setLearnRandomOrderEnabled(
    enabled: boolean
  ) {

    setPreferences((current) => ({
      ...current,
      learnRandomOrderEnabled: enabled
    }))

    await savePreference(
      userId == null
        ? "learn_random_order_enabled"
        : `learn_random_order_enabled_user_${userId}`,
      enabled ? "1" : "0"
    )

  }

  async function setPracticeRandomOrderEnabled(
    enabled: boolean
  ) {

    setPreferences((current) => ({
      ...current,
      practiceRandomOrderEnabled: enabled
    }))

    await savePreference(
      userId == null
        ? "practice_random_order_enabled"
        : `practice_random_order_enabled_user_${userId}`,
      enabled ? "1" : "0"
    )

  }

  async function setThemeMode(
    mode: ThemeMode
  ) {

    setPreferences((current) => ({
      ...current,
      themeMode: mode
    }))

    await savePreference(
      userId == null
        ? "theme_mode"
        : `theme_mode_user_${userId}`,
      mode
    )

  }

  return {
    ...preferences,
    loading,
    setSelectedSubjectId,
    setSelectedTopicId,
    setTtsEnabled,
    setAutoNextEnabled,
    setAutoNextCorrectDelaySeconds,
    setAutoNextWrongDelaySeconds,
    setLearnAutoPlayEnabled,
    setLearnFrontDelaySeconds,
    setLearnBackDelaySeconds,
    setLearnRandomOrderEnabled,
    setPracticeRandomOrderEnabled,
    setThemeMode
  }

}
