import { SQLiteDatabase } from "expo-sqlite"
import { useFocusEffect } from "@react-navigation/native"
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react"

import { ttsService } from "@/services/ttsService"
import type { ThemeMode } from "@/styles/theme"

function parseIdArray(
  value: string | null
): number[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map(Number)
      .filter((item) =>
        Number.isFinite(item)
      )
  } catch {
    return []
  }
}

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
  selectedSubjectIds: number[]
  selectedTopicLevel1Ids: number[]
  selectedTopicLevel2Ids: number[]
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
  themeMode: "dark",
  selectedSubjectIds: [],
  selectedTopicLevel1Ids: [],
  selectedTopicLevel2Ids: []
}

const preferencesCache = new Map<
  number | null,
  Preferences
>()

const preferenceListeners = new Map<
  symbol,
  () => void
>()

function notifyPreferenceChange(
  sourceId?: symbol
) {
  for (const [id, listener] of preferenceListeners) {
    if (sourceId != null && id === sourceId) {
      continue
    }

    listener()
  }
}

function subscribeToPreferenceChanges(
  listener: () => void,
  id: symbol
) {
  preferenceListeners.set(id, listener)

  return () => {
    preferenceListeners.delete(id)
  }
}

export function useStudyPreferences(
  db: SQLiteDatabase | null,
  userId: number | null = null
) {

  const [loading, setLoading] =
    useState(true)
  const [preferences, setPreferences] =
    useState<Preferences>(() => {
      return (
        preferencesCache.get(userId) ?? DEFAULTS
      )
    })
  const [
    lastKnownUserId,
    setLastKnownUserId
  ] = useState<number | null>(userId)

  useEffect(() => {
    if (userId != null) {
      setLastKnownUserId(userId)
    }
  }, [userId])

  const preferenceUserId =
    userId ?? lastKnownUserId

  useEffect(() => {
    if (preferenceUserId == null) {
      setPreferences(DEFAULTS)
      return
    }

    const cached =
      preferencesCache.get(preferenceUserId)

    if (cached) {
      setPreferences(cached)
      return
    }

    setPreferences(DEFAULTS)
  }, [preferenceUserId])

  useEffect(() => {
    if (preferenceUserId == null) {
      return
    }

    preferencesCache.set(
      preferenceUserId,
      preferences
    )
  }, [preferences, preferenceUserId])
  const selectedSubjectKey =
    preferenceUserId == null
      ? "selected_subject_id"
      : `selected_subject_id_user_${preferenceUserId}`
  const selectedTopicKey =
    preferenceUserId == null
      ? "selected_topic_id"
      : `selected_topic_id_user_${preferenceUserId}`
  const autoNextEnabledKey =
    preferenceUserId == null
      ? "auto_next_enabled"
      : `auto_next_enabled_user_${preferenceUserId}`
  const autoNextCorrectDelayKey =
    preferenceUserId == null
      ? "auto_next_correct_delay_seconds"
      : `auto_next_correct_delay_seconds_user_${preferenceUserId}`
  const autoNextWrongDelayKey =
    preferenceUserId == null
      ? "auto_next_wrong_delay_seconds"
      : `auto_next_wrong_delay_seconds_user_${preferenceUserId}`
  const learnAutoPlayKey =
    preferenceUserId == null
      ? "learn_auto_play_enabled"
      : `learn_auto_play_enabled_user_${preferenceUserId}`
  const learnFrontDelayKey =
    preferenceUserId == null
      ? "learn_front_delay_seconds"
      : `learn_front_delay_seconds_user_${preferenceUserId}`
  const learnBackDelayKey =
    preferenceUserId == null
      ? "learn_back_delay_seconds"
      : `learn_back_delay_seconds_user_${preferenceUserId}`
  const learnRandomOrderKey =
    preferenceUserId == null
      ? "learn_random_order_enabled"
      : `learn_random_order_enabled_user_${preferenceUserId}`
  const practiceRandomOrderKey =
    preferenceUserId == null
      ? "practice_random_order_enabled"
      : `practice_random_order_enabled_user_${preferenceUserId}`
  const themeModeKey =
    preferenceUserId == null
      ? "theme_mode"
      : `theme_mode_user_${preferenceUserId}`
  const ttsKey =
    preferenceUserId == null
      ? "tts_enabled"
      : `tts_enabled_user_${preferenceUserId}`
  const selectedSubjectIdsKey =
    preferenceUserId == null
      ? "selected_subject_ids"
      : `selected_subject_ids_user_${preferenceUserId}`
  const selectedTopicLevel1IdsKey =
    preferenceUserId == null
      ? "selected_topic_level1_ids"
      : `selected_topic_level1_ids_user_${preferenceUserId}`
  const selectedTopicLevel2IdsKey =
    preferenceUserId == null
      ? "selected_topic_level2_ids"
      : `selected_topic_level2_ids_user_${preferenceUserId}`
  const preferenceKeys = useMemo(
    () => [
      selectedSubjectKey,
      selectedTopicKey,
      "tts_enabled",
      ttsKey,
      autoNextEnabledKey,
      autoNextCorrectDelayKey,
      autoNextWrongDelayKey,
      learnAutoPlayKey,
      learnFrontDelayKey,
      learnBackDelayKey,
      learnRandomOrderKey,
      practiceRandomOrderKey,
      themeModeKey,
      selectedSubjectIdsKey,
      selectedTopicLevel1IdsKey,
      selectedTopicLevel2IdsKey
    ],
    [
      autoNextCorrectDelayKey,
      autoNextEnabledKey,
      autoNextWrongDelayKey,
      learnAutoPlayKey,
      learnBackDelayKey,
      learnFrontDelayKey,
      learnRandomOrderKey,
      practiceRandomOrderKey,
      preferenceUserId,
      selectedSubjectIdsKey,
      selectedSubjectKey,
      selectedTopicKey,
      selectedTopicLevel1IdsKey,
      selectedTopicLevel2IdsKey,
      ttsKey,
      themeModeKey
    ]
  )
  const preferenceListenerId = useMemo(
    () => Symbol("study-preferences"),
    []
  )

  const loadPreferences = useCallback(async () => {

    if (!db) return

    console.log(
      "[StudyPreferences] loading for user",
      preferenceUserId
    )

    const targetUserId =
      preferenceUserId == null
        ? 0
        : preferenceUserId

    const rows =
      await db.getAllAsync<{
        key: string
        value: string
      }>(
        `
        SELECT key, value
        FROM settings
        WHERE user_id = ?
          AND key IN (${preferenceKeys
            .map(() => "?")
            .join(", ")})
        `,
        [targetUserId, ...preferenceKeys]
      )

    console.log(
      "[StudyPreferences] rows",
      rows
    )

    const updates: Partial<Preferences> = {}
    let userTtsApplied = false

    for (const row of rows) {
      switch (row.key) {
        case selectedSubjectKey:
          updates.selectedSubjectId =
            row.value ? Number(row.value) : null
          break
        case selectedTopicKey:
          updates.selectedTopicId =
            row.value ? Number(row.value) : null
          break
        case ttsKey:
          updates.ttsEnabled = row.value !== "0"
          userTtsApplied = true
          break
        case "tts_enabled":
          if (!userTtsApplied) {
            updates.ttsEnabled = row.value !== "0"
          }
          break
        case autoNextEnabledKey:
          updates.autoNextEnabled =
            row.value === "1"
          break
        case autoNextCorrectDelayKey:
          updates.autoNextCorrectDelaySeconds =
            Math.max(
              1,
              Number(row.value) ||
                DEFAULTS.autoNextCorrectDelaySeconds
            )
          break
        case autoNextWrongDelayKey:
          updates.autoNextWrongDelaySeconds =
            Math.max(
              1,
              Number(row.value) ||
                DEFAULTS.autoNextWrongDelaySeconds
            )
          break
        case learnAutoPlayKey:
          updates.learnAutoPlayEnabled =
            row.value === "1"
          break
        case learnFrontDelayKey:
          updates.learnFrontDelaySeconds =
            Math.max(
              1,
              Number(row.value) ||
                DEFAULTS.learnFrontDelaySeconds
            )
          break
        case learnBackDelayKey:
          updates.learnBackDelaySeconds =
            Math.max(
              1,
              Number(row.value) ||
                DEFAULTS.learnBackDelaySeconds
            )
          break
        case learnRandomOrderKey:
          updates.learnRandomOrderEnabled =
            row.value === "1"
          break
        case practiceRandomOrderKey:
          updates.practiceRandomOrderEnabled =
            row.value === "1"
          break
        case themeModeKey:
          updates.themeMode =
            row.value === "dark"
              ? "dark"
              : "light"
          break
        case selectedSubjectIdsKey:
          if (
            row.value &&
            row.value !== "[]"
          ) {
            updates.selectedSubjectIds =
              parseIdArray(row.value)
          }
          break
        case selectedTopicLevel1IdsKey:
          if (
            row.value &&
            row.value !== "[]"
          ) {
            updates.selectedTopicLevel1Ids =
              parseIdArray(row.value)
          }
          break
        case selectedTopicLevel2IdsKey:
          if (
            row.value &&
            row.value !== "[]"
          ) {
            updates.selectedTopicLevel2Ids =
              parseIdArray(row.value)
          }
          break
      }
    }

    setPreferences((current) => {
      const next = {
        ...current,
        ...updates
      }
      console.log(
        "[StudyPreferences] applying updates",
        updates,
        "current",
        current,
        "next",
        next
      )
      return next
    })
    setLoading(false)

  }, [db, preferenceUserId, preferenceKeys])

  useEffect(() => {

    loadPreferences()

  }, [loadPreferences])

  useFocusEffect(
    useCallback(() => {

      loadPreferences()

    }, [loadPreferences])
  )

  useEffect(() => {

    if (!db) return

    const unsubscribe =
      subscribeToPreferenceChanges(
        loadPreferences,
        preferenceListenerId
      )

    return unsubscribe

  }, [db, loadPreferences])

  useEffect(() => {

    if (preferences.ttsEnabled) {
      ttsService.enable()
    } else {
      ttsService.disable()
    }

  }, [preferences.ttsEnabled])

  async function savePreference(
    key: string,
    value: string | null
  ) {

    if (!db) return

    const targetUserId =
      preferenceUserId == null
        ? 0
        : preferenceUserId

    await db.runAsync(
      `
      INSERT INTO settings (user_id, key, value)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, key)
      DO UPDATE SET value = excluded.value
      `,
    [targetUserId, key, value]
  )

  notifyPreferenceChange(preferenceListenerId)

}

    async function persistIdArray(
      key: string,
      ids: number[]
    ) {

      console.log(
        "[StudyPreferences] persist",
        key,
        ids
      )

      await savePreference(
        key,
        JSON.stringify(ids)
      )

    }

  async function toggleSubjectSelection(
    subjectId: number
  ) {

    let nextArray: number[] = []
    let nextPrimary: number | null = null

    setPreferences((current) => {
      const nextSet = new Set(
        current.selectedSubjectIds
      )
      const wasSelected =
        nextSet.has(subjectId)

      if (wasSelected) {
        nextSet.delete(subjectId)
      } else {
        nextSet.add(subjectId)
      }

      nextArray = Array.from(nextSet)

      if (wasSelected) {
        nextPrimary =
          current.selectedSubjectId ===
          subjectId
            ? nextArray.length > 0
              ? nextArray[
                  nextArray.length - 1
                ]
              : null
            : current.selectedSubjectId
      } else {
        nextPrimary = subjectId
      }

      return {
        ...current,
        selectedSubjectIds: nextArray,
        selectedSubjectId: nextPrimary
      }
    })

    await persistIdArray(
      selectedSubjectIdsKey,
      nextArray
    )
    await savePreference(
      selectedSubjectKey,
      nextPrimary == null
        ? null
        : String(nextPrimary)
    )

  }

  async function toggleTopicSelection(
    levelIndex: number,
    topicId: number
  ) {

    let nextArray: number[] = []
    let nextPrimary: number | null = null

    setPreferences((current) => {
      const targetArray =
        levelIndex === 0
          ? current.selectedTopicLevel1Ids
          : current.selectedTopicLevel2Ids
      const nextSet = new Set(targetArray)
      const wasSelected =
        nextSet.has(topicId)

      if (wasSelected) {
        nextSet.delete(topicId)
      } else {
        nextSet.add(topicId)
      }

      nextArray = Array.from(nextSet)

      if (wasSelected) {
        nextPrimary =
          current.selectedTopicId === topicId
            ? nextArray.length > 0
              ? nextArray[
                  nextArray.length - 1
                ]
              : null
            : current.selectedTopicId
      } else {
        nextPrimary = topicId
      }

      return {
        ...current,
        selectedTopicLevel1Ids:
          levelIndex === 0
            ? nextArray
            : current.selectedTopicLevel1Ids,
        selectedTopicLevel2Ids:
          levelIndex === 0
            ? current.selectedTopicLevel2Ids
            : nextArray,
        selectedTopicId: nextPrimary
      }
    })

    const targetKey =
      levelIndex === 0
        ? selectedTopicLevel1IdsKey
        : selectedTopicLevel2IdsKey

    await persistIdArray(targetKey, nextArray)
    await savePreference(
      selectedTopicKey,
      nextPrimary == null
        ? null
        : String(nextPrimary)
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
      selectedSubjectKey,
      subjectId == null
        ? null
        : String(subjectId)
    )
    await savePreference(
      selectedTopicKey,
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
      selectedTopicKey,
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
      ttsKey,
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
      autoNextEnabledKey,
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
      autoNextCorrectDelayKey,
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
      autoNextWrongDelayKey,
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
      learnAutoPlayKey,
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
      learnFrontDelayKey,
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
      learnBackDelayKey,
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
      learnRandomOrderKey,
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
      practiceRandomOrderKey,
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
      themeModeKey,
      mode
    )

  }

  return {
    ...preferences,
    loading,
    setSelectedSubjectId,
    setSelectedTopicId,
    selectedSubjectIds:
      preferences.selectedSubjectIds,
    selectedTopicLevel1Ids:
      preferences.selectedTopicLevel1Ids,
    selectedTopicLevel2Ids:
      preferences.selectedTopicLevel2Ids,
    toggleSubjectSelection,
    toggleTopicSelection,
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
