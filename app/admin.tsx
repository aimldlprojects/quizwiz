import {
  useCallback,
  useEffect,
  useState
} from "react"
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { resetMasterDatabase, resetUserData } from "../database/resetDatabase"
import { useDatabase } from "../hooks/useDatabase"
import { useStudyPreferences } from "../hooks/useStudyPreferences"
import { useUsers } from "../hooks/useUsers"
import { getThemeColors, type ThemeColors } from "../styles/theme"

const ADMIN_PASSWORD = "0000"
const CHIP_DEFAULT_BG = "#ffffff"
const CHIP_DEFAULT_BORDER = "#ffffff"
const CHIP_ALLOWED_BG = "#16a34a"
const CHIP_PARTIAL_BG = "#fde68a"
const CHIP_PARTIAL_BORDER = "#f59e0b"
const CHIP_ACTIVE_BORDER = "#93c5fd"
const CHIP_PENDING_BG = "#e0f2fe"

export default function AdminScreen() {

  const { db, loading: dbLoading } =
    useDatabase()

  const {
    users,
    activeUser,
    createUser,
    deleteUser,
    setUserDisabled,
    reload,
    setSubjectEnabled,
    setTopicEnabled,
    loading
  } = useUsers(db, true)

  const [password, setPassword] =
    useState("")
  const [name, setName] =
    useState("")
  const [unlocked, setUnlocked] =
    useState(false)
  const [error, setError] =
    useState("")
  const [busyAction, setBusyAction] =
    useState<string | null>(null)
  const [subjectPermissions, setSubjectPermissions] =
    useState<
      Record<
        number,
        {
          id: number
          name: string
          enabled: number
        }[]
      >
    >({})
  const [topicPermissions, setTopicPermissions] =
    useState<
      Record<
        number,
        Record<
          number,
          {
            id: number
            name: string
            key: string | null
            parent_topic_id: number | null
            subject_id: number
            enabled: number
          }[]
        >
      >
    >({})
  const [selectedTopicPaths, setSelectedTopicPaths] =
    useState<Record<string, number>>({})
  const [pendingSubjectToggle, setPendingSubjectToggle] =
    useState<number | null>(null)
  const [pendingTopicToggle, setPendingTopicToggle] =
    useState<number | null>(null)
  const [permissionRefreshCounter, setPermissionRefreshCounter] =
    useState(0)

  const {
    themeMode,
    loading: preferencesLoading
  } = useStudyPreferences(db, activeUser)
  const colors = getThemeColors(themeMode)
  const cardStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border
  }

  const loadTopicsForSubject =
    useCallback(async (
    userId: number,
    subjectId: number
  ) => {

    if (!db) {
      return []
    }

    return db.getAllAsync<{
      id: number
      name: string
      key: string | null
      parent_topic_id: number | null
      subject_id: number
      enabled: number
    }>(
      `
      SELECT
        t.id,
        t.name,
        t.key,
        t.parent_topic_id,
        t.subject_id,
        CASE
          WHEN ut.user_id IS NULL THEN 0
          ELSE 1
        END as enabled
      FROM topics t
      LEFT JOIN user_topics ut
        ON ut.topic_id = t.id
        AND ut.user_id = ?
      WHERE t.subject_id = ?
      ORDER BY
        COALESCE(t.parent_topic_id, 0),
        t.name
      `,
      [userId, subjectId]
    )

  }, [db])

  useEffect(() => {

    async function loadPermissions() {

      if (!db || !unlocked) {
        return
      }

      try {

        const entries = await Promise.all(
          users.map(async (user) => {
            const permissions =
              await db.getAllAsync<{
                id: number
                name: string
                enabled: number
              }>(
                `
                SELECT
                  s.id,
                  s.name,
                  CASE
                    WHEN us.user_id IS NULL THEN 0
                    ELSE 1
                  END as enabled
                FROM subjects s
                LEFT JOIN user_subjects us
                  ON us.subject_id = s.id
                  AND us.user_id = ?
                ORDER BY s.name
                `,
                [user.id]
              )

            return [
              user.id,
              permissions
            ] as const
          })
        )

        setSubjectPermissions(
          Object.fromEntries(entries)
        )

        const nextTopicPermissions: Record<
          number,
          Record<number, any[]>
        > = {}

        for (const [userId, permissions] of entries) {
          const subjectBuckets: Record<number, any[]> = {}

          for (const subject of permissions) {
            const topics =
              await loadTopicsForSubject(
                userId,
                subject.id
              )

            subjectBuckets[subject.id] =
              topics
          }

          nextTopicPermissions[userId] =
            subjectBuckets
        }

        setTopicPermissions(nextTopicPermissions)

        const selectionRows =
          await db.getAllAsync<{
            key: string
            value: string
          }>(
            `
            SELECT key, value
            FROM settings
            WHERE key LIKE 'admin_selected_topic_path_%'
            `
          )
        const nextSelectedPaths: Record<
          string,
          number
        > = {}

        for (const row of selectionRows) {
          const pathKey =
            row.key.replace(
              "admin_selected_topic_path_",
              ""
            )

          if (row.value) {
            nextSelectedPaths[pathKey] =
              Number(row.value)
          }
        }

        setSelectedTopicPaths(nextSelectedPaths)
      } catch (error) {
        console.error(
          "Failed to load admin permissions:",
          error
        )
      }

    }

    loadPermissions()

  }, [
    db,
    loadTopicsForSubject,
    unlocked,
    users,
    permissionRefreshCounter
  ])

  useEffect(() => {
    if (
      password === ADMIN_PASSWORD &&
      !unlocked
    ) {
      setUnlocked(true)
      setError("")
    }
  }, [password, unlocked])

  if (dbLoading || loading || preferencesLoading) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background }
        ]}
      >
        <Text
          style={[
            styles.loadingText,
            { color: colors.text }
          ]}
        >
          Loading admin tools...
        </Text>
      </SafeAreaView>
    )
  }

  async function handleAddUser() {

    const trimmed = name.trim()

    if (!trimmed) return

    setBusyAction("add-user")

    try {
      await createUser(trimmed)
      await reload()
      setName("")
    } catch (error) {
      Alert.alert(
        "Could not add user",
        error instanceof Error
          ? error.message
          : "Please use a different name."
      )
    } finally {
      setBusyAction(null)
      setPermissionRefreshCounter(
        (current) => current + 1
      )
    }

  }

  function unlockAdmin() {

    if (password === ADMIN_PASSWORD) {
      setUnlocked(true)
      setError("")
      return
    }

    setError("Password is 0000.")

  }

  function confirmDeleteUser(
    id: number,
    name: string
  ) {

    Alert.alert(
      "Delete user",
      `Delete ${name}? This removes the profile.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyAction(`delete-${id}`)

            try {
              await deleteUser(
                id,
                name
              )
            } finally {
              setBusyAction(null)
            }
          }
        }
      ]
    )

  }

  function confirmDisableUser(
    id: number,
    name: string,
    disabled: boolean
  ) {

    Alert.alert(
      disabled
        ? "Enable user"
        : "Disable user",
      disabled
        ? `${name} will appear again on startup and profile screens.`
        : `${name} will disappear from startup and profile lists, but all data will be kept.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: disabled
            ? "Enable"
            : "Disable",
          style: disabled
            ? "default"
            : "destructive",
          onPress: async () => {
            setBusyAction(`disable-${id}`)

            try {
              await setUserDisabled(
                id,
                !disabled,
                name
              )
            } finally {
              setBusyAction(null)
            }
          }
        }
      ]
    )

  }

  function confirmResetUser(
    id: number,
    name: string
  ) {

    if (!db) return

    Alert.alert(
      "Reset user data",
      `Clear practice data, progress, streak, badges, and sync state for ${name}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setBusyAction(`reset-${id}`)

            try {
              await resetUserData(db, id)
              await reload()
            } finally {
              setBusyAction(null)
            }
          }
        }
      ]
    )

  }

  function confirmMasterReset() {

    if (!db) return

    Alert.alert(
      "Master DB reset",
      "This clears progress, reviews, streaks, badges, selected user/topic state, and sync state for all users. It keeps user names, subjects, topics, questions, and badge definitions.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            setBusyAction("master-reset")

            try {
              await resetMasterDatabase(db)
              await reload()
              Alert.alert(
                "Reset complete",
                "All user progress data was cleared. Users and learning content were kept."
              )
            } finally {
              setBusyAction(null)
            }
          }
        }
      ]
    )

  }

  async function toggleSubjectPermission(
    userId: number,
    subjectId: number,
    enabled: boolean,
    aliasIds: number[]
  ) {

    setBusyAction(
      `subject-${userId}-${subjectId}`
    )

    try {
      if (!db) {
        return
      }

      const targets =
        aliasIds.length > 0
          ? aliasIds
          : [subjectId]

      for (const targetId of targets) {
        await setSubjectEnabled(
          userId,
          targetId,
          enabled
        )
      }

      const nextPermissions =
        await db.getAllAsync<{
          id: number
          name: string
          enabled: number
        }>(
          `
          SELECT
            s.id,
            s.name,
            CASE
              WHEN us.user_id IS NULL THEN 0
              ELSE 1
            END as enabled
          FROM subjects s
          LEFT JOIN user_subjects us
            ON us.subject_id = s.id
            AND us.user_id = ?
          ORDER BY s.name
          `,
          [userId]
        )
      setSubjectPermissions((current) => ({
        ...current,
        [userId]: nextPermissions
      }))

      const nextTopicsBySubject: Record<
        number,
        any[]
      > = {}

      for (const subject of nextPermissions) {
        nextTopicsBySubject[subject.id] =
          await loadTopicsForSubject(
            userId,
            subject.id
          )
      }

      setTopicPermissions((current) => ({
        ...current,
        [userId]: nextTopicsBySubject
      }))
    } finally {
      setBusyAction(null)
      setPermissionRefreshCounter(
        (current) => current + 1
      )
    }

  }

  async function toggleTopicPermission(
    userId: number,
    subjectId: number,
    topicId: number,
    enabled: boolean,
    aliasIds: number[]
  ) {

    setBusyAction(
      `topic-${userId}-${topicId}`
    )

    try {
      await setTopicEnabled(
        userId,
        topicId,
        enabled
      )

      const reloadIds =
        aliasIds.length > 0
          ? aliasIds
          : [subjectId]

      const nextTopicsBySubject: Record<
        number,
        TopicPermissionRow[]
      > = {}

      for (const reloadId of reloadIds) {
        const topics = await loadTopicsForSubject(
          userId,
          reloadId
        )
        nextTopicsBySubject[reloadId] = topics
      }

      setTopicPermissions((current) => ({
        ...current,
        [userId]: {
          ...(current[userId] ?? {}),
          ...nextTopicsBySubject
        }
      }))

    } finally {
      setBusyAction(null)
      setPermissionRefreshCounter(
        (current) => current + 1
      )
    }

  }

  async function selectTopicBranch(
    userId: number,
    subjectId: number,
    topicId: number
  ) {

    setSelectedTopicPaths((current) => ({
      ...current,
      [`${userId}:${subjectId}`]: topicId
    }))

    if (!db) {
      return
    }

    await db.runAsync(
      `
      INSERT INTO settings (user_id, key, value)
      VALUES (0, ?, ?)
      ON CONFLICT(user_id, key)
      DO UPDATE SET value = excluded.value
      `,
      [
        `admin_selected_topic_path_${userId}:${subjectId}`,
        String(topicId)
      ]
    )

  }

  if (!unlocked) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background }
        ]}
      >
        <View
          style={[
            styles.lockCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border
            }
          ]}
        >
          <Text
            style={[
              styles.lockTitle,
              { color: colors.text }
            ]}
          >
            Admin Access
          </Text>

          <Text
            style={[
              styles.lockText,
              { color: colors.muted }
            ]}
          >
            Enter the admin password to manage learners and reset data.
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            secureTextEntry
            style={[
              styles.passwordInput,
              {
                backgroundColor: colors.surface,
                color: colors.text
              }
            ]}
          />

          {error ? (
            <Text
              style={[
                styles.errorText,
                { color: "#f87171" }
              ]}
            >
              {error}
            </Text>
          ) : null}

          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: colors.iconActive }
            ]}
            onPress={unlockAdmin}
          >
            <Text style={styles.primaryButtonText}>
              Unlock Admin
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background }
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text
          style={[
            styles.heading,
            { color: colors.text }
          ]}
        >
          Manage Profiles
        </Text>

        <Text
          style={[
            styles.subheading,
            { color: colors.muted }
          ]}
        >
          Add learners, remove profiles, reset one child, or clear progress data for everyone.
        </Text>

        <View
          style={[
            styles.addCard,
            cardStyle
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text }
            ]}
          >
            Add user
          </Text>

          <TextInput
            placeholder="New learner name"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            style={[
              styles.nameInput,
              {
                backgroundColor: colors.surface,
                color: colors.text
              }
            ]}
          />

          <Pressable
            style={styles.primaryButton}
            onPress={handleAddUser}
            disabled={busyAction != null}
          >
            <Text style={styles.primaryButtonText}>
              {busyAction === "add-user"
                ? "Adding..."
                : "Add User"}
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.resetCard,
            cardStyle
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text }
            ]}
          >
            Master reset
          </Text>

          <Text
            style={[
              styles.resetText,
              { color: colors.muted }
            ]}
          >
            Clear all user progress data while keeping learner names and seeded learning content.
          </Text>

          <Pressable
            style={styles.masterResetButton}
            onPress={confirmMasterReset}
            disabled={busyAction != null}
          >
            <Text style={styles.masterResetButtonText}>
              {busyAction === "master-reset"
                ? "Resetting..."
                : "Clear All Progress"}
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={users.filter(
            (user) => user.id != null
          )}
          extraData={users}
          scrollEnabled={false}
          keyExtractor={(item) =>
            String(item.id)
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.userRow,
                cardStyle
              ]}
            >
              <View style={styles.userInfo}>
                <Text
                  style={[
                    styles.userName,
                    { color: colors.text }
                  ]}
                >
                  {item.name}
                </Text>

                {item.disabled === 1 ? (
                  <Text
                    style={[
                      styles.disabledTag,
                      {
                        backgroundColor: colors.surface,
                        color: colors.muted
                      }
                    ]}
                  >
                    Disabled profile
                  </Text>
                ) : null}

                <Text
                  style={[
                    styles.userHint,
                    { color: colors.muted }
                  ]}
                >
                  Reset only this learner&apos;s progress or delete the whole profile.
                </Text>

                <View style={styles.subjectSection}>
                  <Text
                    style={[
                      styles.subjectTitle,
                      { color: colors.text }
                    ]}
                  >
                    Allowed subjects
                  </Text>

                  <Text
                    style={[
                      styles.subjectHint,
                      { color: colors.muted }
                    ]}
                  >
                    Tap a subject to turn all its topics on or off. Green means all topics are allowed, white means all are off, and yellow means only some child topics are allowed.
                  </Text>

                  <View style={styles.subjectChips}>
                    {uniqueSubjectsByName(
                      subjectPermissions[item.id] ?? []
                    ).map((subject, index, subjects) => {
                      const combinedTopics =
                        subject.aliasIds.flatMap(
                          (subjectId) =>
                            topicPermissions[item.id]?.[
                              subjectId
                            ] ?? []
                        )
                      const dedupedTopics =
                        uniqueById(combinedTopics)
                      const subjectStatus =
                        getSubjectPermissionStatus(
                          dedupedTopics,
                          subject.enabled === 1
                        )
                      const isPendingSubject =
                        pendingSubjectToggle === subject.id
                      const subjectChipStyles = [
                        styles.subjectChip,
                        subjectStatus === "all" &&
                          styles.subjectChipAll,
                        subjectStatus === "partial" &&
                          styles.subjectChipPartial,
                        isPendingSubject && styles.pendingChip
                      ]

                      const subjectTextColor =
                        subjectStatus === "all"
                          ? "#ffffff"
                          : "#0f172a"

                      return (
                        <View
                          key={`${subject.id}-${subject.name}`}
                          style={styles.permissionGroup}
                        >
                            <Pressable
                              style={subjectChipStyles}
                            onPress={() => {
                              if (!isPendingSubject) {
                                setPendingSubjectToggle(
                                  subject.id
                                )
                                setPendingTopicToggle(null)
                                return
                              }

                              setPendingSubjectToggle(null)
                              setPendingTopicToggle(null)

                              toggleSubjectPermission(
                                item.id,
                                subject.id,
                                subjectStatus !== "all",
                                subject.aliasIds
                              )
                            }}
                            disabled={
                              busyAction != null
                            }
                          >
                             <Text
                               style={[
                                 styles.subjectChipText,
                                  { color: subjectTextColor }
                               ]}
                             >
                              {busyAction ===
                              `subject-${item.id}-${subject.id}`
                                ? "Saving..."
                                : subject.name}
                            </Text>
                          </Pressable>

                          {renderTopicLevels(
                            item.id,
                            subject.id,
                            subject.aliasIds,
                            dedupedTopics,
                            selectedTopicPaths[
                              `${item.id}:${subject.id}`
                            ] ?? null,
                            busyAction,
                            selectTopicBranch,
                            toggleTopicPermission,
                            colors,
                            pendingTopicToggle,
                            setPendingTopicToggle
                          )}
                          {index < subjects.length - 1 ? (
                            <View
                              style={[
                                styles.subjectSeparator,
                                {
                                  backgroundColor:
                                    colors.border
                                }
                              ]}
                            />
                          ) : null}
                        </View>
                      )
                    })}
                  </View>
                </View>
              </View>

              <View style={styles.userActions}>
                <Pressable
                  style={styles.resetButton}
                  onPress={() =>
                    confirmResetUser(
                      item.id,
                      item.name
                    )
                  }
                  disabled={busyAction != null}
                >
                  <Text style={styles.resetButtonText}>
                    {busyAction ===
                    `reset-${item.id}`
                      ? "Resetting..."
                      : "Reset Data"}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.disableButton}
                  onPress={() =>
                    confirmDisableUser(
                      item.id,
                      item.name,
                      item.disabled === 1
                    )
                  }
                  disabled={busyAction != null}
                >
                  <Text style={styles.disableButtonText}>
                    {busyAction ===
                    `disable-${item.id}`
                      ? item.disabled === 1
                        ? "Enabling..."
                        : "Disabling..."
                      : item.disabled === 1
                        ? "Enable"
                        : "Disable"}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() =>
                    confirmDeleteUser(
                      item.id,
                      item.name
                    )
                  }
                  disabled={busyAction != null}
                >
                  <Text style={styles.deleteButtonText}>
                    {busyAction ===
                    `delete-${item.id}`
                      ? "Deleting..."
                      : "Delete"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  )

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f8fbff",
    padding: 20
  },

  content: {
    paddingBottom: 40
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fbff"
  },

  loadingText: {
    fontSize: 18,
    color: "#1e3a5f"
  },

  lockCard: {
    marginTop: 80,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24
  },

  lockTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e3a5f"
  },

  lockText: {
    fontSize: 16,
    color: "#475569",
    marginTop: 10,
    lineHeight: 22
  },

  passwordInput: {
    backgroundColor: "#e0f2fe",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    marginTop: 18
  },

  errorText: {
    color: "#c1121f",
    marginTop: 10,
    fontWeight: "600"
  },

  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1e3a5f"
  },

  subheading: {
    fontSize: 16,
    color: "#475569",
    marginTop: 8,
    lineHeight: 22
  },

  addCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    marginTop: 22
  },

  resetCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    marginTop: 16
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e3a5f",
    marginBottom: 12
  },

  nameInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    marginBottom: 12
  },

  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center"
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },

  resetText: {
    color: "#475569",
    lineHeight: 22
  },

  masterResetButton: {
    backgroundColor: "#ea580c",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 14
  },

  masterResetButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  },

  listContent: {
    paddingTop: 20,
    gap: 12
  },

  userRow: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18
  },

  userInfo: {
    marginBottom: 14
  },

  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e3a5f"
  },

  disabledTag: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#e2e8f0",
    color: "#475569",
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },

  userHint: {
    marginTop: 6,
    color: "#64748b",
    lineHeight: 20
  },

  subjectSection: {
    marginTop: 14
  },

  subjectTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 6
  },

  subjectHint: {
    color: "#64748b",
    marginBottom: 10
  },

  subjectChips: {
    gap: 10
  },

  permissionGroup: {
    gap: 8
  },

  subjectSeparator: {
    height: 1,
    marginTop: 4
  },

  subjectChip: {
    backgroundColor: CHIP_DEFAULT_BG,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: CHIP_DEFAULT_BORDER
  },

  subjectChipAll: {
    backgroundColor: CHIP_ALLOWED_BG,
    borderColor: CHIP_DEFAULT_BORDER
  },

  subjectChipPartial: {
    backgroundColor: CHIP_PARTIAL_BG,
    borderColor: CHIP_PARTIAL_BORDER,
    borderWidth: 3
  },

  subjectChipText: {
    fontWeight: "700"
  },

  topicChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },

  topicLevelBlock: {
    gap: 8
  },

  topicLevelTitle: {
    color: "#64748b",
    fontWeight: "700",
    fontSize: 13
  },

  topicChip: {
    backgroundColor: CHIP_DEFAULT_BG,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: CHIP_DEFAULT_BORDER
  },

  topicChipAll: {
    backgroundColor: CHIP_ALLOWED_BG,
    borderColor: CHIP_DEFAULT_BORDER
  },

  topicChipPartial: {
    backgroundColor: CHIP_PARTIAL_BG,
    borderColor: CHIP_PARTIAL_BORDER,
    borderWidth: 3
  },

  topicChipPathSelected: {
    borderColor: CHIP_ACTIVE_BORDER,
    borderWidth: 3
  },

  pendingChip: {
    borderColor: CHIP_ACTIVE_BORDER,
    borderWidth: 3,
    backgroundColor: CHIP_PENDING_BG
  },

  topicChipText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 13
  },

  userActions: {
    flexDirection: "row",
    gap: 10
  },

  resetButton: {
    flex: 1,
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center"
  },

  resetButtonText: {
    color: "#ffffff",
    fontWeight: "800"
  },

  disableButton: {
    flex: 1,
    backgroundColor: "#64748b",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center"
  },

  disableButtonText: {
    color: "#ffffff",
    fontWeight: "800"
  },

  deleteButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center"
  },

  deleteButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  }

})

type TopicPermissionRow = {
  id: number
  name: string
  key: string | null
  parent_topic_id: number | null
  subject_id: number
  enabled: number
}

function renderTopicLevels(
  userId: number,
  subjectId: number,
  subjectAliasIds: number[],
  topics: TopicPermissionRow[],
  selectedTopicId: number | null,
  busyAction: string | null,
  onSelectBranch: (
    userId: number,
    subjectId: number,
    topicId: number
  ) => void,
  onToggleTopic: (
    userId: number,
    subjectId: number,
    topicId: number,
    enabled: boolean,
    aliasIds: number[]
  ) => Promise<void>,
  colors: ThemeColors,
  pendingTopicToggle: number | null,
  setPendingTopicToggle: (
    value: number | null
  ) => void
) {

  const byId = new Map(
    topics.map((topic) => [topic.id, topic])
  )
  const childrenByParent = new Map<
    number | null,
    TopicPermissionRow[]
  >()
  const lineageIds = new Set<number>()

  for (const topic of topics) {
    const key =
      topic.parent_topic_id ?? null
    const siblings =
      childrenByParent.get(key) ?? []

    siblings.push(topic)
    childrenByParent.set(key, siblings)
  }

  function getChildren(
    topicId: number | null
  ) {

    return childrenByParent.get(topicId) ?? []

  }

  function getSubtreeStatus(
    topicId: number
  ): "all" | "partial" | "off" {

    const currentTopic =
      byId.get(topicId)

    if (!currentTopic) {
      return "off"
    }

    const descendants = [currentTopic]
    const stack = [topicId]

    while (stack.length > 0) {
      const currentId = stack.pop()!
      const children =
        getChildren(currentId)

      for (const child of children) {
        descendants.push(child)
        stack.push(child.id)
      }
    }

    const allEnabled =
      descendants.every(
        (topic) => topic.enabled === 1
      )

    if (allEnabled) {
      return "all"
    }

    const anyEnabled =
      descendants.some(
        (topic) => topic.enabled === 1
      )

    return anyEnabled ? "partial" : "off"

  }

  let current =
    selectedTopicId == null
      ? null
      : byId.get(selectedTopicId) ?? null

  while (current) {
    lineageIds.add(current.id)
    current =
      current.parent_topic_id == null
        ? null
        : byId.get(current.parent_topic_id) ??
          null
  }

  const levels: TopicPermissionRow[][] = []
  let parentId: number | null = null

  while (true) {
    const levelTopics =
      getChildren(parentId)

    if (levelTopics.length === 0) {
      break
    }

    levels.push(levelTopics)

    const nextSelected =
      levelTopics.find((topic) =>
        lineageIds.has(topic.id)
      ) ?? null

    if (!nextSelected) {
      break
    }

    parentId = nextSelected.id
  }

  return levels.map((levelTopics, index) => (
    <View
      key={`${userId}-${subjectId}-level-${index}`}
      style={styles.topicLevelBlock}
    >
      <Text
        style={[
          styles.topicLevelTitle,
          { color: colors.muted }
        ]}
      >
        Topic Level {index + 1}
      </Text>

      <View style={styles.topicChipWrap}>
        {levelTopics.map((topic) => {
          const isSelected =
            lineageIds.has(topic.id)
          const subtreeStatus =
            getSubtreeStatus(topic.id)
          const isPending =
            pendingTopicToggle === topic.id

          const topicTextColor =
            subtreeStatus === "all"
              ? "#ffffff"
              : "#0f172a"

          return (
            <Pressable
              key={topic.id}
              style={[
                styles.topicChip,
                subtreeStatus === "all" &&
                  styles.topicChipAll,
                subtreeStatus === "partial" &&
                  styles.topicChipPartial,
                isSelected &&
                  styles.topicChipPathSelected,
                isPending && styles.pendingChip
              ]}
                          onPress={async () => {
                            onSelectBranch(
                              userId,
                              subjectId,
                              topic.id
                            )

                if (!isPending) {
                  setPendingTopicToggle(topic.id)
                  return
                }

                setPendingTopicToggle(null)

                await onToggleTopic(
                  userId,
                  subjectId,
                  topic.id,
                  topic.enabled !== 1,
                  subjectAliasIds
                )
              }}
              disabled={busyAction != null}
              >
                <Text
                  style={[
                    styles.topicChipText,
                    { color: topicTextColor }
                  ]}
                >
                {busyAction ===
                `topic-${userId}-${topic.id}`
                  ? "Saving..."
                  : topic.name}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  ))

}

function getSubjectPermissionStatus(
  topics: TopicPermissionRow[],
  subjectEnabled: boolean
): "all" | "partial" | "off" {

  if (topics.length === 0) {
    return subjectEnabled ? "all" : "off"
  }

  const enabledTopics =
    topics.filter(
      (topic) => topic.enabled === 1
    ).length

  if (enabledTopics === topics.length) {
    return "all"
  }

  if (enabledTopics > 0 || subjectEnabled) {
    return "partial"
  }

  return "off"

}

function uniqueById<T extends { id: number }>(
  items: T[]
) {

  const map = new Map<number, T>()

  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, item)
    }
  }

  return Array.from(map.values())

}

type SubjectDisplay = {
  id: number
  name: string
  enabled: number
  aliasIds: number[]
}

function uniqueSubjectsByName(
  subjects: {
    id: number
    name: string
    enabled: number
  }[]
): SubjectDisplay[] {
  const buckets = new Map<
    string,
    {
      name: string
      rows: { id: number; enabled: number }[]
    }
  >()

  for (const subject of subjects) {
    const key = normalizeSubjectLabel(subject.name)
    const bucket = buckets.get(key)

    if (!bucket) {
      buckets.set(key, {
        name: subject.name,
        rows: [
          {
            id: subject.id,
            enabled: subject.enabled
          }
        ]
      })
      continue
    }

    bucket.rows.push({
      id: subject.id,
      enabled: subject.enabled
    })
  }

  const result: SubjectDisplay[] = []

  for (const bucket of buckets.values()) {
    const enabledId =
      bucket.rows.find((row) => row.enabled === 1)
    const primaryId =
      enabledId?.id ?? bucket.rows[0]?.id ?? 0
    const enabledFlag = bucket.rows.some(
      (row) => row.enabled === 1
    )

    result.push({
      id: primaryId,
      name: bucket.name,
      enabled: enabledFlag ? 1 : 0,
      aliasIds: bucket.rows.map((row) => row.id)
    })
  }

  return result

}

function normalizeSubjectLabel(value: string) {

  return value.trim().toLowerCase()

}
