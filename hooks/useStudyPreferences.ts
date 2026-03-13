import { SQLiteDatabase } from "expo-sqlite"
import { useFocusEffect } from "@react-navigation/native"
import {
  useCallback,
  useEffect,
  useState
} from "react"

import { ttsService } from "@/services/ttsService"

type Preferences = {
  selectedSubjectId: number | null
  selectedTopicId: number | null
  ttsEnabled: boolean
}

const DEFAULTS: Preferences = {
  selectedSubjectId: null,
  selectedTopicId: null,
  ttsEnabled: true
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
        `,
        [
          selectedSubjectKey,
          selectedTopicKey,
          "tts_enabled"
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

  return {
    ...preferences,
    loading,
    setSelectedSubjectId,
    setSelectedTopicId,
    setTtsEnabled
  }

}
