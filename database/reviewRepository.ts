// database/reviewRepository.ts

import * as SQLite from "expo-sqlite"

export interface ReviewRecord {
  question_id: number
  user_id: number
  repetition: number
  interval: number
  ease_factor: number
  next_review: number
  last_result: string
}

export class ReviewRepository {

  private db: SQLite.SQLiteDatabase

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db
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
      SELECT *
      FROM reviews
      WHERE user_id = ?
      AND question_id = ?
      `,
      [userId, questionId]
    )

    return row ?? null
  }

  // ---------- save review ----------

  async saveReview(review: ReviewRecord): Promise<void> {

    await this.db.runAsync(
      `
      INSERT INTO reviews (
        user_id,
        question_id,
        repetition,
        interval,
        ease_factor,
        next_review,
        last_result
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)

      ON CONFLICT(user_id, question_id)
      DO UPDATE SET
        repetition = excluded.repetition,
        interval = excluded.interval,
        ease_factor = excluded.ease_factor,
        next_review = excluded.next_review,
        last_result = excluded.last_result
      `,
      [
        review.user_id,
        review.question_id,
        review.repetition,
        review.interval,
        review.ease_factor,
        review.next_review,
        review.last_result
      ]
    )

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
      JOIN reviews r
      ON q.id = r.question_id

      WHERE r.user_id = ?
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
      JOIN reviews r
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
      SELECT *
      FROM questions

      WHERE id NOT IN (
        SELECT question_id
        FROM reviews
        WHERE user_id = ?
      )

      ORDER BY RANDOM()
      LIMIT ?
      `,
      [userId, limit]
    )

    return rows
  }

}