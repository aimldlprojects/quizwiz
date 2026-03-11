// database/initDB.ts

import { SQLiteDatabase } from "expo-sqlite"

/*
--------------------------------------------------
Initialize All Database Tables
--------------------------------------------------

Called once when app starts.

Responsible for creating all required tables.

--------------------------------------------------
*/

export async function initDB(db: SQLiteDatabase) {

  await createUsersTable(db)

  await createSubjectsTable(db)

  await createTopicsTable(db)

  await createQuestionsTable(db)

  await createReviewsTable(db)

}

/*
--------------------------------------------------
Users
--------------------------------------------------
*/

async function createUsersTable(db: SQLiteDatabase) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `)

}

/*
--------------------------------------------------
Subjects
--------------------------------------------------
*/

async function createSubjectsTable(db: SQLiteDatabase) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `)

}

/*
--------------------------------------------------
Topics
--------------------------------------------------
*/

async function createTopicsTable(db: SQLiteDatabase) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      name TEXT NOT NULL
    )
  `)

}

/*
--------------------------------------------------
Questions
--------------------------------------------------
*/

async function createQuestionsTable(db: SQLiteDatabase) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS questions (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      topic_id INTEGER,

      type TEXT,

      question TEXT,
      answer TEXT

    )
  `)

}

/*
--------------------------------------------------
Reviews (Spaced Repetition)
--------------------------------------------------
*/

async function createReviewsTable(db: SQLiteDatabase) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reviews (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      user_id INTEGER,
      question_id INTEGER,

      repetition INTEGER DEFAULT 0,
      interval INTEGER DEFAULT 0,
      ease_factor REAL DEFAULT 2.5,

      next_review INTEGER,
      last_result TEXT,

      UNIQUE(user_id, question_id)

    )
  `)

}