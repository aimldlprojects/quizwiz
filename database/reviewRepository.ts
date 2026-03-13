import * as SQLite from "expo-sqlite"
import { Review } from "../domain/entities/review"

export interface ReviewRecord {
  id?: number
  question_id: number
  user_id: number
  repetition: number
  interval: number
  ease_factor: number
  next_review: number
  last_result: string
  rev_id: number | null
}

export interface StoredQuestionRecord {
  id: number
  question: string
  answer: string | number
  type?: string | null
}

export class ReviewRepository {

  private db: SQLite.SQLiteDatabase
  private schemaChecked = false

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db
  }

  /*
  --------------------------------------------------
  Get Database Instance
  --------------------------------------------------
  */

  getDB() {
    return this.db
  }

  // ---------- create table ----------

  async init(): Promise<void> {

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS reviews (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,

        repetition INTEGER DEFAULT 0,
        interval INTEGER DEFAULT 0,
        ease_factor REAL DEFAULT 2.5,

        next_review INTEGER,
        last_result TEXT,

        rev_id INTEGER,

        UNIQUE(user_id, question_id)
      )
    `)

  }

  // ---------- get review record ----------

  async getReview(
    userId: number,
    questionId: number
  ): Promise<ReviewRecord | null> {

    const row = await this.db.getFirstAsync<ReviewRecord>(
      `
      SELECT
        user_id,
        question_id,
        repetition,
        interval,
        ease_factor,
        next_review,
        last_result,
        rev_id
      FROM reviews
      WHERE user_id = ?
      AND question_id = ?
      LIMIT 1
      `,
      [userId, questionId]
    )

    return row ?? null
  }

  // ---------- save review ----------

  async saveReview(review: Review): Promise<void> {

    await this.ensureSchema()

    const incomingRev =
      (review as any).revId ??
      Date.now()

    await this.db.runAsync(
      `
      INSERT INTO reviews (
        user_id,
        question_id,
        repetition,
        interval,
        ease_factor,
        next_review,
        last_result,
        rev_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)

      ON CONFLICT(user_id, question_id)
      DO UPDATE SET
        repetition = excluded.repetition,
        interval = excluded.interval,
        ease_factor = excluded.ease_factor,
        next_review = excluded.next_review,
        last_result = excluded.last_result,
        rev_id = excluded.rev_id

      WHERE reviews.rev_id IS NULL
         OR reviews.rev_id < excluded.rev_id
      `,
      [
        review.userId,
        review.questionId,
        review.repetition,
        review.interval,
        review.easeFactor,
        review.nextReview,
        review.lastResult,
        incomingRev
      ]
    )

  }

  async ensureQuestionRecord(
    question: StoredQuestionRecord,
    topicId: number | null = null
  ) {

    await this.db.runAsync(
      `
      INSERT INTO questions (
        id,
        topic_id,
        type,
        question,
        answer
      )
      VALUES (?, ?, ?, ?, ?)

      ON CONFLICT(id)
      DO UPDATE SET
        topic_id = COALESCE(questions.topic_id, excluded.topic_id),
        type = COALESCE(excluded.type, questions.type),
        question = excluded.question,
        answer = excluded.answer
      `,
      [
        question.id,
        topicId,
        question.type ?? null,
        question.question,
        String(question.answer)
      ]
    )

  }

  private async ensureSchema() {

    if (this.schemaChecked) {
      return
    }

    const columns =
      await this.db.getAllAsync<{ name: string }>(
        `
        PRAGMA table_info(reviews)
        `
      )

    const columnNames = new Set(
      columns.map((column) => column.name)
    )

    if (!columnNames.has("rev_id")) {
      await this.db.execAsync(`
        ALTER TABLE reviews
        ADD COLUMN rev_id INTEGER
      `)
    }

    if (!columnNames.has("created_at")) {
      await this.db.execAsync(`
        ALTER TABLE reviews
        ADD COLUMN created_at INTEGER
      `)
    }

    this.schemaChecked = true

  }

  // ---------- due reviews ----------

  async getDueReviews(
    userId: number,
    limit: number = 20
  ) {

    const rows = await this.db.getAllAsync(
      `
      SELECT q.*
      FROM questions q
      INNER JOIN reviews r
        ON q.id = r.question_id

      WHERE r.user_id = ?
        AND r.next_review IS NOT NULL
        AND r.next_review <= ?

      ORDER BY r.next_review ASC
      LIMIT ?
      `,
      [userId, Date.now(), limit]
    )

    return rows

  }

  // ---------- failed questions ----------

  async getFailedQuestions(
    userId: number,
    limit: number = 10
  ) {

    const rows = await this.db.getAllAsync(
      `
      SELECT q.*
      FROM questions q
      INNER JOIN reviews r
        ON q.id = r.question_id

      WHERE r.user_id = ?
        AND r.last_result = 'again'

      ORDER BY r.next_review ASC
      LIMIT ?
      `,
      [userId, limit]
    )

    return rows

  }

  // ---------- new questions ----------

  async getNewQuestions(
    userId: number,
    limit: number = 10
  ) {

    const rows = await this.db.getAllAsync(
      `
      SELECT q.*
      FROM questions q

      WHERE NOT EXISTS (
        SELECT 1
        FROM reviews r
        WHERE r.user_id = ?
        AND r.question_id = q.id
      )

      ORDER BY RANDOM()
      LIMIT ?
      `,
      [userId, limit]
    )

    return rows

  }

  // ---------- get max revision ----------

  async getMaxRevision(
    userId: number
  ): Promise<number> {

    const row = await this.db.getFirstAsync<{ max_rev: number }>(
      `
      SELECT MAX(rev_id) as max_rev
      FROM reviews
      WHERE user_id = ?
      `,
      [userId]
    )

    return row?.max_rev ?? 0

  }

}
