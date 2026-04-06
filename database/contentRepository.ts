import { SQLiteDatabase } from "expo-sqlite"

export type TopicRecord = {
  id: number
  name: string
  key: string | null
  subject_id: number
  parent_topic_id: number | null
}

export type QuestionRecord = {
  id: number
  topic_id: number
  type: string | null
  question: string
  answer: string
}

export async function getAllTopics(
  db: SQLiteDatabase
) {

  return db.getAllAsync<TopicRecord>(
    `
    SELECT
      id,
      name,
      key,
      subject_id,
      parent_topic_id
    FROM topics
    ORDER BY name
    `
  )

}

export async function getTopicById(
  db: SQLiteDatabase,
  topicId: number
) {

  return db.getFirstAsync<TopicRecord>(
    `
    SELECT
      id,
      name,
      key,
      subject_id,
      parent_topic_id
    FROM topics
    WHERE id = ?
    LIMIT 1
    `,
    [topicId]
  )

}

export function getDescendantTopicIds(
  topics: TopicRecord[],
  rootTopicId: number
) {

  const result = new Set<number>([
    rootTopicId
  ])

  let expanded = true

  while (expanded) {
    expanded = false

    for (const topic of topics) {
      if (
        topic.parent_topic_id != null &&
        result.has(topic.parent_topic_id) &&
        !result.has(topic.id)
      ) {
        result.add(topic.id)
        expanded = true
      }
    }
  }

  return Array.from(result)

}

export function getTopicLineage(
  topics: TopicRecord[],
  topicId: number | null
) {

  if (topicId == null) {
    return []
  }

  const byId = new Map(
    topics.map((topic) => [topic.id, topic])
  )

  const lineage: TopicRecord[] = []
  let current = byId.get(topicId) ?? null

  while (current) {
    lineage.unshift(current)
    current =
      current.parent_topic_id == null
        ? null
        : byId.get(current.parent_topic_id) ??
          null
  }

  return lineage

}

export async function getQuestionsForTopicTree(
  db: SQLiteDatabase,
  topicIds: number[],
  limit?: number,
  orderBy: "random" | "sequence" = "random",
  offset?: number
) {

  if (topicIds.length === 0) {
    return [] as QuestionRecord[]
  }

  const placeholders =
    topicIds.map(() => "?").join(", ")

  const limitClause =
    limit == null ? "" : "LIMIT ?"
  const offsetClause =
    offset == null ? "" : "OFFSET ?"
  const orderClause =
    orderBy === "sequence"
      ? "ORDER BY topic_id ASC, id ASC"
      : "ORDER BY RANDOM()"

  const args = [...topicIds]

  if (limit != null) {
    args.push(limit)
  }

  if (offset != null) {
    args.push(offset)
  }

  return db.getAllAsync<QuestionRecord>(
    `
    SELECT
      id,
      topic_id,
      type,
      question,
      answer
    FROM questions
    WHERE topic_id IN (${placeholders})
    ${orderClause}
    ${limitClause}
    ${offsetClause}
    `,
    args
  )

}

export async function getQuestionCountForTopicTree(
  db: SQLiteDatabase,
  topicIds: number[]
) {
  if (topicIds.length === 0) {
    return 0
  }

  const placeholders =
    topicIds.map(() => "?").join(", ")

  const row = await db.getFirstAsync<{
    count: number
  }>(
    `
    SELECT COUNT(*) as count
    FROM questions
    WHERE topic_id IN (${placeholders})
    `,
    topicIds
  )

  return row?.count ?? 0
}
