import { SQLiteDatabase } from "expo-sqlite"

/*
--------------------------------------------------
Initialize All Database Tables
--------------------------------------------------
*/

export async function initDB(db: SQLiteDatabase) {

  await createUsersTable(db)

  await createSubjectsTable(db)

  await createTopicsTable(db)
  await migrateTopicsTable(db)

  await createQuestionsTable(db)

  await createReviewsTable(db)
  await migrateReviewsTable(db)

  await createSyncMetaTable(db)

  await createSettingsTable(db)

  await createUserStreakTable(db)

  await createUserBadgesTable(db)

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
      parent_topic_id INTEGER,
      name TEXT NOT NULL
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

      rev_id INTEGER,

      created_at INTEGER DEFAULT (strftime('%s','now')*1000),

      UNIQUE(user_id, question_id)

    )
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
