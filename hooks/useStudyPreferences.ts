import { SQLiteDatabase } from "expo-sqlite"
import { useEffect, useState } from "react"

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

async function ensureSettings(
  db: SQLiteDatabase
) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)

}

export function useStudyPreferences(
  db: SQLiteDatabase | null
) {

  const [loading, setLoading] =
    useState(true)
  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULTS)

  useEffect(() => {

    if (!db) return

    load()

  }, [db])

  useEffect(() => {

    if (preferences.ttsEnabled) {
      ttsService.enable()
    } else {
      ttsService.disable()
    }

  }, [preferences.ttsEnabled])

  async function load() {

    if (!db) return

    await ensureSettings(db)

    const rows =
      await db.getAllAsync<{
        key: string
        value: string
      }>(
        `
        SELECT key, value
        FROM settings
        WHERE key IN (
          'selected_subject_id',
          'selected_topic_id',
          'tts_enabled'
        )
        `
      )

    const next = { ...DEFAULTS }

    for (const row of rows) {
      switch (row.key) {
        case "selected_subject_id":
          next.selectedSubjectId =
            row.value ? Number(row.value) : null
          break
        case "selected_topic_id":
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

    await ensureSettings(db)

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
      "selected_subject_id",
      subjectId == null
        ? null
        : String(subjectId)
    )
    await savePreference(
      "selected_topic_id",
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
      "selected_topic_id",
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
