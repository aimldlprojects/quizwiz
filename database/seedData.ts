import { SQLiteDatabase } from "expo-sqlite"
import { seedBadges } from "./seedBadges"
import {
  seedSubjects,
  SUBJECTS
} from "./seedSubjects"
import {
  seedTopics,
  TOPIC_DEFINITIONS
} from "./seedTopics"
import { UserSubjectRepository } from "./userSubjectRepository"
import {
  DEFAULT_CURRICULUM_SUBJECTS,
  DEFAULT_CURRICULUM_TOPIC_KEYS
} from "@/config/curriculum"
import {
  type RegisteredDevice,
  setActiveDeviceBackendKey,
  setAllowedDeviceBackendKeys
} from "./deviceRegistryRepository"

const USERS = [
  [1, "Bhavi"],
  [2, "Madhu"],
  [3, "Quiz Kid"]
] as const

const DEFAULT_DEVICE_CATALOG = [
  {
    backendKey: "device_bhavi_tab",
    displayName: "bhavi_tab"
  },
  {
    backendKey: "device_bhavi_phone",
    displayName: "bhavi_phone"
  },
  {
    backendKey: "device_mabhu_tab",
    displayName: "mabhu_tab"
  },
  {
    backendKey: "device_mabhu_phone",
    displayName: "mabhu_phone"
  },
  {
    backendKey: "device_eshu_s22",
    displayName: "eshu_s22"
  },
  {
    backendKey: "device_eshu_tablet",
    displayName: "eshu_tablet"
  }
] as const

const DEFAULT_ACTIVE_DEVICE_BY_USER = new Map<
  number,
  string
>([
  [1, "device_bhavi_tab"],
  [2, "device_mabhu_tab"],
  [3, "device_eshu_s22"]
])

type QuestionSeed = {
  topicKey: string
  type: string
  question: string
  answer: string
}

const QUESTION_SEEDS: QuestionSeed[] = [
  {
    topicKey: "addition",
    type: "math-addition",
    question: "4 + 3 = ?",
    answer: "7"
  },
  {
    topicKey: "addition",
    type: "math-addition",
    question: "9 + 6 = ?",
    answer: "15"
  },
  {
    topicKey: "subtraction",
    type: "math-subtraction",
    question: "12 - 5 = ?",
    answer: "7"
  },
  {
    topicKey: "subtraction",
    type: "math-subtraction",
    question: "18 - 9 = ?",
    answer: "9"
  },
  {
    topicKey: "division",
    type: "math-division",
    question: "24 / 6 = ?",
    answer: "4"
  },
  {
    topicKey: "division",
    type: "math-division",
    question: "35 / 5 = ?",
    answer: "7"
  },
  {
    topicKey: "fractions",
    type: "fractions",
    question: "What fraction of 8 slices is 4 slices?",
    answer: "1/2"
  },
  {
    topicKey: "fractions",
    type: "fractions",
    question: "What fraction of 10 stars is 5 stars?",
    answer: "1/2"
  },
  {
    topicKey: "word_problems",
    type: "word-problem",
    question: "Ria has 3 apples and gets 4 more. How many apples now?",
    answer: "7"
  },
  {
    topicKey: "word_problems",
    type: "word-problem",
    question: "There are 12 birds and 5 fly away. How many are left?",
    answer: "7"
  },
  {
    topicKey: "two_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: I am __ school.",
    answer: "at"
  },
  {
    topicKey: "two_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: We go __ home.",
    answer: "to"
  },
  {
    topicKey: "three_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: The sun is h_t.",
    answer: "hot"
  },
  {
    topicKey: "three_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: The cat sat on the m_t.",
    answer: "mat"
  },
  {
    topicKey: "four_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: The fish can s__m fast.",
    answer: "swim"
  },
  {
    topicKey: "four_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: We read a b__k.",
    answer: "book"
  },
  {
    topicKey: "five_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: I like to r__d books.",
    answer: "read"
  },
  {
    topicKey: "five_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: We plant a s__ed in soil.",
    answer: "seed"
  },
  {
    topicKey: "six_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: The bright p__ple flower smells nice.",
    answer: "purple"
  },
  {
    topicKey: "six_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: We saw a r__bit in the garden.",
    answer: "rabbit"
  },
  {
    topicKey: "seven_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: The r__nbow has many colors.",
    answer: "rainbow"
  },
  {
    topicKey: "seven_letter_words",
    type: "spelling-fill-blank",
    question: "Fill in the blank: A g__affe has a long neck.",
    answer: "giraffe"
  },
  {
    topicKey: "jumble_three_letter",
    type: "jumble-word",
    question: "Unscramble the word: tac",
    answer: "cat"
  },
  {
    topicKey: "jumble_three_letter",
    type: "jumble-word",
    question: "Unscramble the word: god",
    answer: "dog"
  },
  {
    topicKey: "jumble_five_letter",
    type: "jumble-word",
    question: "Unscramble the word: leapp",
    answer: "apple"
  },
  {
    topicKey: "jumble_five_letter",
    type: "jumble-word",
    question: "Unscramble the word: girte",
    answer: "tiger"
  },
  {
    topicKey: "science_short_words",
    type: "science-spelling",
    question: "Fill in the blank: The sun gives us h__.",
    answer: "heat"
  },
  {
    topicKey: "science_short_words",
    type: "science-spelling",
    question: "Fill in the blank: Plants need a_r.",
    answer: "air"
  },
  {
    topicKey: "science_long_words",
    type: "science-spelling",
    question: "Fill in the blank: A p__net moves around the sun.",
    answer: "planet"
  },
  {
    topicKey: "science_long_words",
    type: "science-spelling",
    question: "Fill in the blank: A r__ket flies into space.",
    answer: "rocket"
  }
]

export async function seedData(
  db: SQLiteDatabase
) {

  await cleanupLegacyCurriculum(db)

  for (const [id, name] of USERS) {
    await db.runAsync(
      `
      INSERT INTO users(id, name)
      VALUES (?, ?)
      ON CONFLICT(id)
      DO UPDATE SET name = excluded.name
      `,
      [id, name]
    )
  }

  const subjectIds =
    await seedSubjects(db)
  const topicIds =
    await seedTopics(db, subjectIds)
  const userSubjectRepo =
    new UserSubjectRepository(db)

  await seedBadges(db)

  for (const [id] of USERS) {
    const existingAssignments =
      await db.getFirstAsync<{
        count: number
      }>(
        `
        SELECT COUNT(*) as count
        FROM user_subjects
        WHERE user_id = ?
        `,
        [id]
      )

    if ((existingAssignments?.count ?? 0) === 0) {
      await userSubjectRepo.grantSubjectsByName(
        id,
        [...DEFAULT_CURRICULUM_SUBJECTS]
      )
    }

    const existingTopicAssignments =
      await db.getFirstAsync<{
        count: number
      }>(
        `
        SELECT COUNT(*) as count
        FROM user_topics
        WHERE user_id = ?
        `,
        [id]
      )

    if ((existingTopicAssignments?.count ?? 0) === 0) {
      await userSubjectRepo.grantTopicsByKeys(
        id,
        [...DEFAULT_CURRICULUM_TOPIC_KEYS]
      )
    }
  }

  for (const seed of QUESTION_SEEDS) {
    const topicId =
      topicIds[seed.topicKey]

    if (!topicId) {
      continue
    }

    await db.runAsync(
      `
      UPDATE questions
      SET
        topic_id = ?,
        type = ?,
        answer = ?
      WHERE question = ?
      `,
      [
        topicId,
        seed.type,
        seed.answer,
        seed.question
      ]
    )

    await db.runAsync(
      `
      INSERT OR IGNORE INTO questions (
        topic_id,
        type,
        question,
        answer
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        topicId,
        seed.type,
        seed.question,
        seed.answer
      ]
    )
  }

  await seedDefaultDevices(db)

}

async function seedDefaultDevices(
  db: SQLiteDatabase
) {

  const timestamp = Date.now()
  const users = USERS.map(([id]) => id)

  for (const userId of users) {
    const registryKey =
      `device_registry_user_${userId}`
    const allowedKey =
      `allowed_device_keys_user_${userId}`
    const activeKey =
      `active_device_key_user_${userId}`

    const existingRegistry =
      await db.getFirstAsync<{
        value: string | null
      }>(
        `
        SELECT value
        FROM settings
        WHERE user_id = ?
          AND key = ?
        LIMIT 1
        `,
        [userId, registryKey]
      )

    const parsedRegistry: RegisteredDevice[] = []
    if (existingRegistry?.value) {
      try {
        const parsed = JSON.parse(existingRegistry.value)
        if (Array.isArray(parsed)) {
          for (const entry of parsed) {
            const backendKey = String(
              entry?.backendKey ?? ""
            ).trim()
            const displayName = String(
              entry?.displayName ?? ""
            ).trim()
            if (!backendKey || !displayName) {
              continue
            }
            parsedRegistry.push({
              backendKey,
              displayName,
              createdAt:
                Number(entry?.createdAt) || timestamp,
              updatedAt:
                Number(entry?.updatedAt) || timestamp
            })
          }
        }
      } catch {
        parsedRegistry.length = 0
      }
    }

    const existingKeys = new Set(
      parsedRegistry.map((device) => device.backendKey)
    )
    const mergedRegistry = [
      ...parsedRegistry,
      ...DEFAULT_DEVICE_CATALOG.filter(
        (device) => !existingKeys.has(device.backendKey)
      ).map((device) => ({
        backendKey: device.backendKey,
        displayName: device.displayName,
        createdAt: timestamp,
        updatedAt: timestamp
      }))
    ]

    if (
      !existingRegistry?.value ||
      mergedRegistry.length !== parsedRegistry.length
    ) {
      await db.runAsync(
        `
        INSERT INTO settings (
          user_id,
          key,
          value,
          updated_at
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, key)
        DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
        `,
        [
          userId,
          registryKey,
          JSON.stringify(mergedRegistry),
          timestamp
        ]
      )
    }

    const existingAllowed =
      await db.getFirstAsync<{
        value: string | null
      }>(
        `
        SELECT value
        FROM settings
        WHERE user_id = ?
          AND key = ?
        LIMIT 1
        `,
        [userId, allowedKey]
      )

    if (!existingAllowed?.value) {
      await setAllowedDeviceBackendKeys(db, userId, null)
    }

    const activeDeviceBackendKey =
      DEFAULT_ACTIVE_DEVICE_BY_USER.get(userId) ??
      mergedRegistry[0]?.backendKey ??
      DEFAULT_DEVICE_CATALOG[0].backendKey

    const activeRow =
      await db.getFirstAsync<{
        value: string | null
      }>(
        `
        SELECT value
        FROM settings
        WHERE user_id = ?
          AND key = ?
        LIMIT 1
        `,
        [userId, activeKey]
      )

    if (!activeRow?.value) {
      await setActiveDeviceBackendKey(
        db,
        userId,
        activeDeviceBackendKey
      )
    }
  }

}

async function cleanupLegacyCurriculum(
  db: SQLiteDatabase
) {

  const allowedSubjects = SUBJECTS
  const allowedTopicKeys = new Set<string>(
    TOPIC_DEFINITIONS.map(
      (topic) => topic.key
    )
  )

  const legacySubjectRows =
    await db.getAllAsync<{ id: number }>(
      `
      SELECT id
      FROM subjects
      WHERE name NOT IN (
        ${allowedSubjects.map(() => "?").join(", ")}
      )
      `,
      allowedSubjects
    )

  const legacySubjectIds =
    legacySubjectRows.map((row) => row.id)

  if (legacySubjectIds.length > 0) {
    const placeholders =
      legacySubjectIds
        .map(() => "?")
        .join(", ")

    await db.runAsync(
      `
      DELETE FROM user_subjects
      WHERE subject_id IN (${placeholders})
      `,
      legacySubjectIds
    )

    const legacyTopicRows =
      await db.getAllAsync<{ id: number }>(
        `
        SELECT id
        FROM topics
        WHERE subject_id IN (${placeholders})
        `,
        legacySubjectIds
      )

    const legacyTopicIds =
      legacyTopicRows.map((row) => row.id)

    if (legacyTopicIds.length > 0) {
      const topicPlaceholders =
        legacyTopicIds
          .map(() => "?")
          .join(", ")

      await db.runAsync(
        `
        DELETE FROM questions
        WHERE topic_id IN (${topicPlaceholders})
        `,
        legacyTopicIds
      )

      await db.runAsync(
        `
        DELETE FROM user_topics
        WHERE topic_id IN (${topicPlaceholders})
        `,
        legacyTopicIds
      )

      await db.runAsync(
        `
        DELETE FROM topics
        WHERE id IN (${topicPlaceholders})
        `,
        legacyTopicIds
      )
    }

    await db.runAsync(
      `
      DELETE FROM subjects
      WHERE id IN (${placeholders})
      `,
      legacySubjectIds
    )
  }

  const existingTopics =
    await db.getAllAsync<{
      id: number
      key: string | null
    }>(
      `
      SELECT id, key
      FROM topics
      `
    )

  const removableTopicIds =
    existingTopics
      .filter(
        (topic) =>
          topic.key == null ||
          !allowedTopicKeys.has(topic.key)
      )
      .map((topic) => topic.id)

  if (removableTopicIds.length > 0) {
    const placeholders =
      removableTopicIds
        .map(() => "?")
        .join(", ")

    await db.runAsync(
      `
      DELETE FROM questions
      WHERE topic_id IN (${placeholders})
      `,
      removableTopicIds
    )

    await db.runAsync(
      `
      DELETE FROM user_topics
      WHERE topic_id IN (${placeholders})
      `,
      removableTopicIds
    )

    await db.runAsync(
      `
      DELETE FROM topics
      WHERE id IN (${placeholders})
      `,
      removableTopicIds
    )
  }

}
