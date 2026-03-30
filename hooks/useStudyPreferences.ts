import { SQLiteDatabase } from "expo-sqlite"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"

import { markSyncDirty } from "@/database/syncMetaRepository"
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

const preferencesCache = new Map<number, Preferences>()

function clonePreferences(prefs: Preferences) {
  return {
    ...prefs,
    selectedSubjectIds: [...prefs.selectedSubjectIds],
    selectedTopicLevel1Ids: [
      ...prefs.selectedTopicLevel1Ids
    ],
    selectedTopicLevel2Ids: [
      ...prefs.selectedTopicLevel2Ids
    ]
  }
}

function cachePreferencesForUser(
  userId: number | null,
  prefs: Preferences
) {
  if (userId == null) {
    return
  }

  preferencesCache.set(
    userId,
    clonePreferences(prefs)
  )
}

export function useStudyPreferences(
  db: SQLiteDatabase | null,
  userId: number | null = null
) {
  const [loading, setLoading] = useState(true)
  const [preferences, setPreferences] =
    useState<Preferences>(() =>
      userId == null
        ? DEFAULTS
        : preferencesCache.get(userId) ??
          DEFAULTS
    )
  const preferencesRef = useRef(preferences)
  const loadTokenRef = useRef(0)

  const preferenceUserId = userId

  useEffect(() => {
    preferencesRef.current = preferences
  }, [preferences])

  useEffect(() => {
    if (preferenceUserId == null) {
      return
    }

    const cached = preferencesCache.get(
      preferenceUserId
    )

    if (cached) {
      const nextPreferences = clonePreferences(cached)
      preferencesRef.current = nextPreferences
      setPreferences(nextPreferences)
    }
  }, [preferenceUserId])

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
      selectedSubjectIdsKey,
      selectedSubjectKey,
      selectedTopicKey,
      selectedTopicLevel1IdsKey,
      selectedTopicLevel2IdsKey,
      ttsKey,
      themeModeKey
    ]
  )

  const loadPreferences = useCallback(async () => {
    const loadToken = ++loadTokenRef.current

    if (!db || preferenceUserId == null) {
      setPreferences(DEFAULTS)
      setLoading(false)
      return
    }

    setLoading(true)

    const rows = await db.getAllAsync<{
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
      [preferenceUserId, ...preferenceKeys]
    )

    const updates: Partial<Preferences> = {}
    let userTtsApplied = false
    const cachedBase =
      preferencesCache.get(preferenceUserId) ?? DEFAULTS

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
          updates.autoNextEnabled = row.value === "1"
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
            row.value === "dark" ? "dark" : "light"
          break
        case selectedSubjectIdsKey:
          updates.selectedSubjectIds = parseIdArray(
            row.value
          )
          break
        case selectedTopicLevel1IdsKey:
          updates.selectedTopicLevel1Ids =
            parseIdArray(row.value)
          break
        case selectedTopicLevel2IdsKey:
          updates.selectedTopicLevel2Ids =
            parseIdArray(row.value)
          break
      }
    }

    const nextPreferences = {
      ...cachedBase,
      ...updates
    }

    if (loadToken !== loadTokenRef.current) {
      return
    }

    const clonedPreferences =
      clonePreferences(nextPreferences)
    preferencesRef.current = clonedPreferences
    setPreferences(clonedPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )
    setLoading(false)
  }, [
    autoNextCorrectDelayKey,
    autoNextEnabledKey,
    autoNextWrongDelayKey,
    db,
    learnAutoPlayKey,
    learnBackDelayKey,
    learnFrontDelayKey,
    learnRandomOrderKey,
    preferenceKeys,
    preferenceUserId,
    practiceRandomOrderKey,
    selectedSubjectIdsKey,
    selectedSubjectKey,
    selectedTopicKey,
    selectedTopicLevel1IdsKey,
    selectedTopicLevel2IdsKey,
    ttsKey,
    themeModeKey
  ])

  useEffect(() => {
    void loadPreferences()
  }, [loadPreferences])

  useEffect(() => {
    if (preferences.ttsEnabled) {
      ttsService.enable()
    } else {
      ttsService.disable()
    }
  }, [preferences.ttsEnabled])

  async function savePreference(
    key: string,
    value: string | null,
    updatedAt: number = Date.now()
  ) {
    if (!db || preferenceUserId == null) {
      return
    }

    const current = await db.getFirstAsync<{
      updated_at: number | null
    }>(
      `
      SELECT updated_at
      FROM settings
      WHERE user_id = ?
        AND key = ?
      LIMIT 1
      `,
      [preferenceUserId, key]
    )

    if (
      current?.updated_at != null &&
      updatedAt < current.updated_at
    ) {
      return
    }

    if (current) {
      await db.runAsync(
        `
        UPDATE settings
        SET value = ?, updated_at = ?
        WHERE user_id = ?
          AND key = ?
        `,
        [value, updatedAt, preferenceUserId, key]
      )
    } else {
      await db.runAsync(
        `
        INSERT INTO settings (user_id, key, value, updated_at)
        VALUES (?, ?, ?, ?)
        `,
        [preferenceUserId, key, value, updatedAt]
      )
    }

    await markSyncDirty(
      db,
      preferenceUserId,
      updatedAt
    )

  }

  async function persistIdArray(
    key: string,
    ids: number[],
    updatedAt: number = Date.now()
  ) {
    await savePreference(
      key,
      JSON.stringify(ids),
      updatedAt
    )
  }

  async function toggleSubjectSelection(
    subjectId: number
  ) {
    const updatedAt = Date.now()
    const current = preferencesRef.current
    const nextSet = new Set(
      current.selectedSubjectIds
    )
    const wasSelected = nextSet.has(subjectId)

    if (wasSelected) {
      nextSet.delete(subjectId)
    } else {
      nextSet.add(subjectId)
    }

    const nextArray = Array.from(nextSet)
    const nextPrimary = wasSelected
      ? current.selectedSubjectId === subjectId
        ? nextArray.length > 0
          ? nextArray[nextArray.length - 1]
          : null
        : current.selectedSubjectId
      : subjectId
    const nextPreferences = {
      ...current,
      selectedSubjectIds: nextArray,
      selectedSubjectId: nextPrimary
    }

    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await persistIdArray(
      selectedSubjectIdsKey,
      nextArray,
      updatedAt
    )
    await savePreference(
      selectedSubjectKey,
      nextPrimary == null
        ? null
        : String(nextPrimary),
      updatedAt
    )

  }

  async function toggleTopicSelection(
    levelIndex: number,
    topicId: number
  ) {
    const updatedAt = Date.now()
    const current = preferencesRef.current
    const targetArray =
      levelIndex === 0
        ? current.selectedTopicLevel1Ids
        : current.selectedTopicLevel2Ids
    const nextSet = new Set(targetArray)
    const wasSelected = nextSet.has(topicId)

    if (wasSelected) {
      nextSet.delete(topicId)
    } else {
      nextSet.add(topicId)
    }

    const nextArray = Array.from(nextSet)
    const nextPrimary = wasSelected
      ? current.selectedTopicId === topicId
        ? nextArray.length > 0
          ? nextArray[nextArray.length - 1]
          : null
        : current.selectedTopicId
      : topicId
    const nextPreferences = {
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

    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    const targetKey =
      levelIndex === 0
        ? selectedTopicLevel1IdsKey
        : selectedTopicLevel2IdsKey

    await persistIdArray(targetKey, nextArray, updatedAt)
    await savePreference(
      selectedTopicKey,
      nextPrimary == null
        ? null
        : String(nextPrimary),
      updatedAt
    )

  }

  async function setSelectedSubjectId(
    subjectId: number | null
  ) {
    const updatedAt = Date.now()
    const current = preferencesRef.current
    const nextPreferences = {
      ...current,
      selectedSubjectId: subjectId,
      selectedTopicId: null
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(
      selectedSubjectKey,
      subjectId == null ? null : String(subjectId),
      updatedAt
    )
    await savePreference(selectedTopicKey, null, updatedAt)

  }

  async function setSelectedTopicId(
    topicId: number | null
  ) {
    const updatedAt = Date.now()
    const current = preferencesRef.current
    const nextPreferences = {
      ...current,
      selectedTopicId: topicId
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(
      selectedTopicKey,
      topicId == null ? null : String(topicId),
      updatedAt
    )

  }

  async function setTtsEnabled(enabled: boolean) {
    const updatedAt = Date.now()
    const nextPreferences = {
      ...preferencesRef.current,
      ttsEnabled: enabled
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(
      ttsKey,
      enabled ? "1" : "0",
      updatedAt
    )
  }

  async function setAutoNextEnabled(
    enabled: boolean
  ) {
    const updatedAt = Date.now()
    const nextPreferences = {
      ...preferencesRef.current,
      autoNextEnabled: enabled
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(
      autoNextEnabledKey,
      enabled ? "1" : "0",
      updatedAt
    )
  }

  async function setAutoNextCorrectDelaySeconds(
    seconds: number
  ) {
    const nextValue = Math.max(1, seconds)
    const updatedAt = Date.now()
    const nextPreferences = {
      ...preferencesRef.current,
      autoNextCorrectDelaySeconds: nextValue
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(
      autoNextCorrectDelayKey,
      String(nextValue),
      updatedAt
    )
  }

  async function setAutoNextWrongDelaySeconds(
    seconds: number
  ) {
    const nextValue = Math.max(1, seconds)
    const updatedAt = Date.now()
    const nextPreferences = {
      ...preferencesRef.current,
      autoNextWrongDelaySeconds: nextValue
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(
      autoNextWrongDelayKey,
      String(nextValue),
      updatedAt
    )
  }

  async function setLearnAutoPlayEnabled(
    enabled: boolean
  ) {
    const updatedAt = Date.now()
    const nextPreferences = {
      ...preferencesRef.current,
      learnAutoPlayEnabled: enabled
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(
      learnAutoPlayKey,
      enabled ? "1" : "0",
      updatedAt
    )
  }

  async function setLearnFrontDelaySeconds(
    seconds: number
  ) {
    const nextValue = Math.max(1, seconds)
    const updatedAt = Date.now()
    const nextPreferences = {
      ...preferencesRef.current,
      learnFrontDelaySeconds: nextValue
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(
      learnFrontDelayKey,
      String(nextValue),
      updatedAt
    )
  }

  async function setLearnBackDelaySeconds(
    seconds: number
  ) {
    const nextValue = Math.max(1, seconds)
    const updatedAt = Date.now()
    const nextPreferences = {
      ...preferencesRef.current,
      learnBackDelaySeconds: nextValue
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(
      learnBackDelayKey,
      String(nextValue),
      updatedAt
    )
  }

  async function setLearnRandomOrderEnabled(
    enabled: boolean
  ) {
    const updatedAt = Date.now()
    const nextPreferences = {
      ...preferencesRef.current,
      learnRandomOrderEnabled: enabled
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(
      learnRandomOrderKey,
      enabled ? "1" : "0",
      updatedAt
    )
  }

  async function setPracticeRandomOrderEnabled(
    enabled: boolean
  ) {
    const updatedAt = Date.now()
    const nextPreferences = {
      ...preferencesRef.current,
      practiceRandomOrderEnabled: enabled
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(
      practiceRandomOrderKey,
      enabled ? "1" : "0",
      updatedAt
    )
  }

  async function setThemeMode(mode: ThemeMode) {
    const updatedAt = Date.now()
    const nextPreferences = {
      ...preferencesRef.current,
      themeMode: mode
    }
    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    cachePreferencesForUser(
      preferenceUserId,
      nextPreferences
    )

    await savePreference(themeModeKey, mode, updatedAt)
  }

  return {
    ...preferences,
    loading,
    setSelectedSubjectId,
    setSelectedTopicId,
    selectedSubjectIds: preferences.selectedSubjectIds,
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
