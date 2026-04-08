import { SQLiteDatabase } from "expo-sqlite"

type TopicRow = {
  id: number
  key: string | null
}

type SignatureResponse = {
  signature?: string
}

type QuestionRow = {
  topic_key: string
  type: string | null
  question: string
  answer: string
}

type QuestionsResponse = {
  questions?: QuestionRow[]
}

const CONTENT_SIGNATURE_KEY = "content_catalog_signature"
const CONTENT_SIGNATURE_USER_ID = 0
const CONTENT_TIMEOUT_MS = 10000

async function getLocalSignature(
  db: SQLiteDatabase
) {
  const row = await db.getFirstAsync<{
    value: string | null
  }>(
    `
    SELECT value
    FROM settings
    WHERE user_id = ?
      AND key = ?
    LIMIT 1
    `,
    [CONTENT_SIGNATURE_USER_ID, CONTENT_SIGNATURE_KEY]
  )

  return row?.value ?? null
}

async function setLocalSignature(
  db: SQLiteDatabase,
  signature: string
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
      CONTENT_SIGNATURE_USER_ID,
      CONTENT_SIGNATURE_KEY,
      signature,
      Date.now()
    ]
  )
}

async function fetchJsonWithTimeout<T>(
  url: string
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, CONTENT_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(
        `Content sync failed: ${response.status}`
      )
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeoutId)
  }
}

async function getTopicIdByKey(
  db: SQLiteDatabase
) {
  const topics = await db.getAllAsync<TopicRow>(
    `
    SELECT id, key
    FROM topics
    WHERE key IS NOT NULL
    `
  )

  const byKey = new Map<string, number>()
  for (const topic of topics) {
    if (!topic.key) {
      continue
    }
    byKey.set(topic.key, topic.id)
  }

  return byKey
}

export async function syncContentCatalog(
  db: SQLiteDatabase,
  serverUrl: string
) {
  const signaturePayload =
    await fetchJsonWithTimeout<SignatureResponse>(
      `${serverUrl}/content/signature`
    )

  const remoteSignature =
    signaturePayload.signature?.trim()

  if (!remoteSignature) {
    return
  }

  const localSignature =
    await getLocalSignature(db)

  if (localSignature === remoteSignature) {
    return
  }

  const contentPayload =
    await fetchJsonWithTimeout<QuestionsResponse>(
      `${serverUrl}/content/questions`
    )
  const questions =
    contentPayload.questions ?? []

  if (questions.length === 0) {
    await setLocalSignature(
      db,
      remoteSignature
    )
    return
  }

  const topicIdByKey =
    await getTopicIdByKey(db)

  await db.execAsync("BEGIN TRANSACTION")
  try {
    for (const row of questions) {
      const topicId =
        topicIdByKey.get(row.topic_key)

      if (!topicId) {
        continue
      }

      await db.runAsync(
        `
        INSERT INTO questions (
          topic_id,
          type,
          question,
          answer
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(topic_id, question)
        DO UPDATE SET
          type = excluded.type,
          answer = excluded.answer
        `,
        [
          topicId,
          row.type ?? null,
          row.question,
          row.answer
        ]
      )
    }

    await setLocalSignature(
      db,
      remoteSignature
    )
    await db.execAsync("COMMIT")
  } catch (error) {
    await db.execAsync("ROLLBACK")
    throw error
  }
}

