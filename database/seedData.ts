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
  id?: number
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
    type: "english-spell-bee",
    question: "I am at school.",
    answer: "at"
  },
  {
    topicKey: "two_letter_words",
    type: "english-spell-bee",
    question: "We go to home.",
    answer: "to"
  },
  {
    topicKey: "three_letter_words",
    type: "english-spell-bee",
    question: "The sun is hot.",
    answer: "hot"
  },
  {
    topicKey: "three_letter_words",
    type: "english-spell-bee",
    question: "The cat sat on the mat.",
    answer: "mat"
  },
  {
    topicKey: "four_letter_words",
    type: "english-spell-bee",
    question: "The fish can swim fast.",
    answer: "swim"
  },
  {
    topicKey: "four_letter_words",
    type: "english-spell-bee",
    question: "We read a book.",
    answer: "book"
  },
  {
    topicKey: "five_letter_words",
    type: "english-spell-bee",
    question: "I like to read books.",
    answer: "read"
  },
  {
    topicKey: "five_letter_words",
    type: "english-spell-bee",
    question: "We plant a seed in soil.",
    answer: "seed"
  },
  {
    topicKey: "six_letter_words",
    type: "english-spell-bee",
    question: "The bright purple flower smells nice.",
    answer: "purple"
  },
  {
    topicKey: "six_letter_words",
    type: "english-spell-bee",
    question: "We saw a rabbit in the garden.",
    answer: "rabbit"
  },
  {
    topicKey: "seven_letter_words",
    type: "english-spell-bee",
    question: "The rainbow has many colors.",
    answer: "rainbow"
  },
  {
    topicKey: "seven_letter_words",
    type: "english-spell-bee",
    question: "A giraffe has a long neck.",
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
    question: "The sun gives us heat.",
    answer: "heat"
  },
  {
    topicKey: "science_short_words",
    type: "science-spelling",
    question: "Plants need air.",
    answer: "air"
  },
  {
    topicKey: "science_long_words",
    type: "science-spelling",
    question: "A planet moves around the sun.",
    answer: "planet"
  },
  {
    topicKey: "science_long_words",
    type: "science-spelling",
    question: "A rocket flies into space.",
    answer: "rocket"
  }
]

type TableQuestionSeed = QuestionSeed & {
  id: number
  legacyId: number
}

const TABLE_TOPIC_RANGES = [
  {
    topicKey: "tables_1_5",
    minTable: 1,
    maxTable: 5,
    idBase: 100000
  },
  {
    topicKey: "tables_6_10",
    minTable: 6,
    maxTable: 10,
    idBase: 100100
  },
  {
    topicKey: "tables_11_15",
    minTable: 11,
    maxTable: 15,
    idBase: 100200
  },
  {
    topicKey: "tables_16_20",
    minTable: 16,
    maxTable: 20,
    idBase: 100300
  }
] as const

function buildTableQuestionSeeds() {
  const seeds: TableQuestionSeed[] = []

  for (const range of TABLE_TOPIC_RANGES) {
    for (let table = range.minTable; table <= range.maxTable; table++) {
      for (let multiplier = 1; multiplier <= 10; multiplier++) {
        const legacyId = Number(`${table}${multiplier}`)
        const id =
          range.idBase +
          (table - range.minTable) * 10 +
          multiplier

        seeds.push({
          id,
          legacyId,
          topicKey: range.topicKey,
          type: "math-tables",
          question: `${table} x ${multiplier}`,
          answer: String(table * multiplier)
        })
      }
    }
  }

  return seeds
}

const TABLE_QUESTION_SEEDS = buildTableQuestionSeeds()
const TABLE_QUESTION_ID_MAP = new Map(
  TABLE_QUESTION_SEEDS.map((seed) => [
    seed.legacyId,
    seed.id
  ])
)

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

  for (const seed of TABLE_QUESTION_SEEDS) {
    const topicId =
      topicIds[seed.topicKey]

    if (!topicId) {
      continue
    }

    await db.runAsync(
      `
      INSERT INTO questions (
        id,
        topic_id,
        type,
        question,
        answer
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(topic_id, question)
      DO UPDATE SET
        id = excluded.id,
        topic_id = excluded.topic_id,
        type = excluded.type,
        answer = excluded.answer
      `,
      [
        seed.id,
        topicId,
        seed.type,
        seed.question,
        seed.answer
      ]
    )
  }

  await remapTableQuestionReferences(db, topicIds)

  // Remove legacy fill-in-the-blank prompt rows so old question text
  // does not continue to appear in wrong/due review joins.
  await db.runAsync(
    `
    DELETE FROM questions
    WHERE question LIKE 'Fill in the blank:%'
      AND (
        type = 'spelling-fill-blank'
        OR type = 'english-spell-bee'
        OR type = 'science-spelling'
      )
    `
  )

  await seedDefaultDevices(db)

}

async function remapTableQuestionReferences(
  db: SQLiteDatabase,
  topicIds: Record<string, number>
) {

  const migrationAt = Date.now()
  let revisionOffset = 0

  for (const seed of TABLE_QUESTION_SEEDS) {
    const newId = TABLE_QUESTION_ID_MAP.get(
      seed.legacyId
    )

    if (newId == null || newId === seed.legacyId) {
      continue
    }

    const topicId =
      topicIds[seed.topicKey]

    const reviewRev =
      migrationAt + revisionOffset

    await db.runAsync(
      `
      DELETE FROM reviews
      WHERE question_id = ?
        AND EXISTS (
          SELECT 1
          FROM reviews existing
          WHERE existing.user_id = reviews.user_id
            AND existing.question_id = ?
        )
      `,
      [
        seed.legacyId,
        newId
      ]
    )

    await db.runAsync(
      `
      UPDATE reviews
      SET
        question_id = ?,
        rev_id = ?,
        last_modified_rev = ?,
        sync_version = COALESCE(sync_version, 0) + 1,
        updated_at = ?
      WHERE question_id = ?
      `,
      [
        newId,
        reviewRev,
        reviewRev,
        migrationAt,
        seed.legacyId
      ]
    )

    await db.runAsync(
      `
      UPDATE stats
      SET
        question_id = ?,
        topic_id = ?,
        updated_at = ?
      WHERE question_id = ?
      `,
      [
        newId,
        topicId,
        migrationAt,
        seed.legacyId
      ]
    )

    revisionOffset += 1
  }

  await remapSettingsQuestionIds(
    db,
    TABLE_QUESTION_ID_MAP,
    migrationAt
  )

  await remapLegacyPracticeSessions(
    db,
    TABLE_QUESTION_ID_MAP,
    migrationAt
  )

}

async function remapSettingsQuestionIds(
  db: SQLiteDatabase,
  legacyToNew: Map<number, number>,
  updatedAt: number
) {

  const rows = await db.getAllAsync<{
    user_id: number
    key: string
    value: string | null
  }>(
    `
    SELECT
      user_id,
      key,
      value
    FROM settings
    WHERE key LIKE 'learn_progress_topic_%'
       OR key LIKE 'practice_session_topic_%'
    `
  )

  for (const row of rows) {
    if (!row.value) {
      continue
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(row.value)
    } catch {
      continue
    }

    const remapped =
      remapTableQuestionIds(
        parsed,
        legacyToNew
      )

    const serialized =
      JSON.stringify(remapped)

    if (serialized === row.value) {
      continue
    }

    await db.runAsync(
      `
      UPDATE settings
      SET value = ?,
          updated_at = ?
      WHERE user_id = ?
        AND key = ?
      `,
      [
        serialized,
        updatedAt,
        row.user_id,
        row.key
      ]
    )
  }

}

async function remapLegacyPracticeSessions(
  db: SQLiteDatabase,
  legacyToNew: Map<number, number>,
  updatedAt: number
) {

  const rows = await db.getAllAsync<{
    user_id: number
    topic_id: number
    state_json: string | null
  }>(
    `
    SELECT
      user_id,
      topic_id,
      state_json
    FROM practice_sessions
    `
  )

  for (const row of rows) {
    if (!row.state_json) {
      continue
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(row.state_json)
    } catch {
      continue
    }

    const remapped =
      remapTableQuestionIds(
        parsed,
        legacyToNew
      )
    const serialized =
      JSON.stringify(remapped)

    if (serialized === row.state_json) {
      continue
    }

    await db.runAsync(
      `
      UPDATE practice_sessions
      SET state_json = ?,
          updated_at = ?
      WHERE user_id = ?
        AND topic_id = ?
      `,
      [
        serialized,
        updatedAt,
        row.user_id,
        row.topic_id
      ]
    )
  }

}

function remapTableQuestionIds(
  value: unknown,
  legacyToNew: Map<number, number>
): unknown {

  if (Array.isArray(value)) {
    return value.map((item) =>
      remapTableQuestionIds(
        item,
        legacyToNew
      )
    )
  }

  if (!value || typeof value !== "object") {
    return value
  }

  const input =
    value as Record<string, unknown>
  const output: Record<string, unknown> = {}

  for (const [key, currentValue] of Object.entries(
    input
  )) {
    if (
      typeof currentValue === "number" &&
      (
        key === "id" ||
        key === "cardId" ||
        key === "questionId" ||
        key === "question_id"
      )
    ) {
      output[key] =
        legacyToNew.get(currentValue) ??
        currentValue
      continue
    }

    if (key === "seenIds" && Array.isArray(currentValue)) {
      output[key] = currentValue.map((entry) =>
        typeof entry === "number"
          ? legacyToNew.get(entry) ?? entry
          : entry
      )
      continue
    }

    output[key] = remapTableQuestionIds(
      currentValue,
      legacyToNew
    )
  }

  return output

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
