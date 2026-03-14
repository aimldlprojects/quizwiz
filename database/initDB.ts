import { SQLiteDatabase } from "expo-sqlite"
import { seedData } from "./seedData"

/*
--------------------------------------------------
Initialize All Database Tables
--------------------------------------------------
*/

export async function initDB(db: SQLiteDatabase) {

  await createUsersTable(db)
  await migrateUsersTable(db)

  await createSubjectsTable(db)
  await createUserSubjectsTable(db)
  await createUserTopicsTable(db)

  await createTopicsTable(db)
  await migrateTopicsTable(db)
  await createTopicsIndexes(db)

  await createQuestionsTable(db)
  await migrateQuestionsTable(db)
  await createQuestionsIndexes(db)

  await createReviewsTable(db)
  await migrateReviewsTable(db)

  await createSyncMetaTable(db)

  await createSettingsTable(db)

  await createBadgesTable(db)

  await createUserStreakTable(db)

  await createStatsTable(db)
  await migrateStatsTable(db)

  await createUserBadgesTable(db)

  await seedData(db)

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
      name TEXT NOT NULL,
      disabled INTEGER NOT NULL DEFAULT 0
    )
  `)

}

async function migrateUsersTable(
  db: SQLiteDatabase
) {

  const columns =
    await db.getAllAsync<{ name: string }>(
      `
      PRAGMA table_info(users)
      `
    )

  const columnNames = new Set(
    columns.map((column) => column.name)
  )

  if (!columnNames.has("disabled")) {
    await db.execAsync(`
      ALTER TABLE users
      ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0
    `)
  }

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
      parent_topic_id INTEGER,
      key TEXT,
      name TEXT NOT NULL
    )
  `)

}

async function createUserSubjectsTable(
  db: SQLiteDatabase
) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_subjects (
      user_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      PRIMARY KEY(user_id, subject_id)
    )
  `)

}

async function createUserTopicsTable(
  db: SQLiteDatabase
) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_topics (
      user_id INTEGER NOT NULL,
      topic_id INTEGER NOT NULL,
      PRIMARY KEY(user_id, topic_id)
    )
  `)

}

async function migrateTopicsTable(
  db: SQLiteDatabase
) {

  const columns =
    await db.getAllAsync<{ name: string }>(
      `
      PRAGMA table_info(topics)
      `
    )

  const columnNames = new Set(
    columns.map((column) => column.name)
  )

  if (!columnNames.has("parent_topic_id")) {
    await db.execAsync(`
      ALTER TABLE topics
      ADD COLUMN parent_topic_id INTEGER
    `)
  }

  if (!columnNames.has("key")) {
    await db.execAsync(`
      ALTER TABLE topics
      ADD COLUMN key TEXT
    `)
  }

}

async function createTopicsIndexes(
  db: SQLiteDatabase
) {

  await db.execAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_topics_key
    ON topics(key)
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
      answer TEXT,

      UNIQUE(topic_id, question)

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

      rev_id INTEGER,

      created_at INTEGER DEFAULT (strftime('%s','now')*1000),

      UNIQUE(user_id, question_id)

    )
  `)

}

async function migrateQuestionsTable(
  db: SQLiteDatabase
) {

  const columns =
    await db.getAllAsync<{ name: string }>(
      `
      PRAGMA table_info(questions)
      `
    )

  const columnNames = new Set(
    columns.map((column) => column.name)
  )

  if (!columnNames.has("type")) {
    await db.execAsync(`
      ALTER TABLE questions
      ADD COLUMN type TEXT
    `)
  }

}

async function createQuestionsIndexes(
  db: SQLiteDatabase
) {

  await db.execAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_questions_topic_question
    ON questions(topic_id, question)
  `)

}

async function migrateReviewsTable(
  db: SQLiteDatabase
) {

  const columns =
    await db.getAllAsync<{ name: string }>(
      `
      PRAGMA table_info(reviews)
      `
    )

  const columnNames = new Set(
    columns.map((column) => column.name)
  )

  if (!columnNames.has("rev_id")) {
    await db.execAsync(`
      ALTER TABLE reviews
      ADD COLUMN rev_id INTEGER
    `)
  }

  if (!columnNames.has("created_at")) {
    await db.execAsync(`
      ALTER TABLE reviews
      ADD COLUMN created_at INTEGER
      DEFAULT (strftime('%s','now')*1000)
    `)
  }

}

/*
--------------------------------------------------
Sync Meta
--------------------------------------------------
*/

async function createSyncMetaTable(db: SQLiteDatabase) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)

  await db.execAsync(`
    INSERT OR IGNORE INTO sync_meta
    (key,value)
    VALUES ('last_sync_rev','0')
  `)

}

/*
--------------------------------------------------
Settings (Sync Mode Toggle)
--------------------------------------------------
*/

async function createSettingsTable(db: SQLiteDatabase) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `)

  await db.execAsync(`
    INSERT OR IGNORE INTO settings
    (key,value)
    VALUES ('sync_mode','local')
  `)

}

/*
--------------------------------------------------
User Streak
--------------------------------------------------
*/

async function createUserStreakTable(db: SQLiteDatabase) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_streak (

      user_id INTEGER PRIMARY KEY,

      current_streak INTEGER DEFAULT 0,

      longest_streak INTEGER DEFAULT 0,

      last_practice_date TEXT

    )
  `)

}

/*
--------------------------------------------------
User Badges
--------------------------------------------------
*/

async function createUserBadgesTable(db: SQLiteDatabase) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_badges (

      user_id INTEGER,

      id TEXT,

      title TEXT,
      description TEXT,

      unlocked INTEGER,
      unlockedAt INTEGER,

      PRIMARY KEY(user_id,id)

    )
  `)

}

async function createBadgesTable(db: SQLiteDatabase) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS badges (

      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL

    )
  `)

}

async function createStatsTable(db: SQLiteDatabase) {

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS stats (

      id INTEGER PRIMARY KEY AUTOINCREMENT,

      user_id INTEGER NOT NULL,
      correct INTEGER DEFAULT 0,
      wrong INTEGER DEFAULT 0,
      practiced_at INTEGER DEFAULT (strftime('%s','now')*1000)

    )
  `)

}

async function migrateStatsTable(
  db: SQLiteDatabase
) {

  const columns =
    await db.getAllAsync<{ name: string }>(`
      PRAGMA table_info(stats)
      `
    )

  const columnNames = new Set(
    columns.map((column) => column.name)
  )

  if (!columnNames.has("practiced_at")) {
    await db.execAsync(`
      ALTER TABLE stats
      ADD COLUMN practiced_at INTEGER
    `)

    await db.execAsync(`
      UPDATE stats
      SET practiced_at = COALESCE(practiced_at, created_at, (strftime('%s','now')*1000))
    `)
  }

}
