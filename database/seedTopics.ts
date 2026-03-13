import { SQLiteDatabase } from "expo-sqlite"

type TopicSeed = {
  key: string
  name: string
  subjectId: number
  parentKey?: string
}

export const TOPIC_DEFINITIONS = [
  {
    key: "multiplication_tables",
    name: "Multiplication Tables",
    subject: "Mathematics"
  },
  {
    key: "tables_1_5",
    name: "Tables 1-5",
    subject: "Mathematics",
    parentKey: "multiplication_tables"
  },
  {
    key: "tables_6_10",
    name: "Tables 6-10",
    subject: "Mathematics",
    parentKey: "multiplication_tables"
  },
  {
    key: "tables_11_15",
    name: "Tables 11-15",
    subject: "Mathematics",
    parentKey: "multiplication_tables"
  },
  {
    key: "tables_16_20",
    name: "Tables 16-20",
    subject: "Mathematics",
    parentKey: "multiplication_tables"
  },
  {
    key: "addition",
    name: "Addition",
    subject: "Mathematics"
  },
  {
    key: "subtraction",
    name: "Subtraction",
    subject: "Mathematics"
  },
  {
    key: "division",
    name: "Division",
    subject: "Mathematics"
  },
  {
    key: "fractions",
    name: "Fractions",
    subject: "Mathematics"
  },
  {
    key: "word_problems",
    name: "Word Problems",
    subject: "Mathematics"
  },
  {
    key: "word_spellings",
    name: "Word Spellings",
    subject: "English"
  },
  {
    key: "two_letter_words",
    name: "2 Letter Words",
    subject: "English",
    parentKey: "word_spellings"
  },
  {
    key: "three_letter_words",
    name: "3 Letter Words",
    subject: "English",
    parentKey: "word_spellings"
  },
  {
    key: "four_letter_words",
    name: "4 Letter Words",
    subject: "English",
    parentKey: "word_spellings"
  },
  {
    key: "five_letter_words",
    name: "5 Letter Words",
    subject: "English",
    parentKey: "word_spellings"
  },
  {
    key: "six_letter_words",
    name: "6 Letter Words",
    subject: "English",
    parentKey: "word_spellings"
  },
  {
    key: "seven_letter_words",
    name: "7 Letter Words",
    subject: "English",
    parentKey: "word_spellings"
  },
  {
    key: "jumbled_words",
    name: "Jumbled Words",
    subject: "English"
  },
  {
    key: "jumble_three_letter",
    name: "3 Letter Jumble",
    subject: "English",
    parentKey: "jumbled_words"
  },
  {
    key: "jumble_five_letter",
    name: "5 Letter Jumble",
    subject: "English",
    parentKey: "jumbled_words"
  },
  {
    key: "science_spellings",
    name: "Science Spellings",
    subject: "Science"
  },
  {
    key: "science_short_words",
    name: "Science Short Words",
    subject: "Science",
    parentKey: "science_spellings"
  },
  {
    key: "science_long_words",
    name: "Science Long Words",
    subject: "Science",
    parentKey: "science_spellings"
  }
] as const

const TOPIC_SEEDS = (
  subjectIds: Record<string, number>
): TopicSeed[] => [
  ...TOPIC_DEFINITIONS.map((topic) => ({
    key: topic.key,
    name: topic.name,
    subjectId:
      subjectIds[topic.subject],
    parentKey: topic.parentKey
  }))
]

export async function seedTopics(
  db: SQLiteDatabase,
  subjectIds: Record<string, number>
): Promise<Record<string, number>> {

  const topicIds: Record<string, number> = {}

  for (const seed of TOPIC_SEEDS(subjectIds)) {
    const parentId =
      seed.parentKey == null
        ? null
        : topicIds[seed.parentKey] ?? null

    await db.runAsync(
      `
      INSERT OR IGNORE INTO topics (
        subject_id,
        parent_topic_id,
        key,
        name
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        seed.subjectId,
        parentId,
        seed.key,
        seed.name
      ]
    )

    const row = await db.getFirstAsync<{ id: number }>(
      `
      SELECT id
      FROM topics
      WHERE key = ?
      LIMIT 1
      `,
      [seed.key]
    )

    if (row?.id) {
      topicIds[seed.key] = row.id

      await db.runAsync(
        `
        UPDATE topics
        SET
          subject_id = ?,
          parent_topic_id = ?,
          name = ?
        WHERE id = ?
        `,
        [
          seed.subjectId,
          parentId,
          seed.name,
          row.id
        ]
      )
    }
  }

  return topicIds

}
