import { Platform } from "react-native";
import { db } from "./db";

export async function initDB() {

  if (Platform.OS === "web" || !db) {
    return;
  }

  await db.execAsync(`
  
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER,
    topic_id INTEGER,
    type TEXT,
    question TEXT,
    explanation TEXT,
    media_url TEXT,
    tts_text TEXT,
    difficulty INTEGER DEFAULT 1,
    display_order INTEGER,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS question_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER,
    option_text TEXT,
    is_correct INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS question_pairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER,
    left_item TEXT,
    right_item TEXT
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    user_id TEXT,
    question_id INTEGER,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    attempt_count INTEGER DEFAULT 0,
    total_time INTEGER DEFAULT 0,
    avg_time INTEGER DEFAULT 0,
    last_attempt INTEGER,
    streak INTEGER DEFAULT 0,
    PRIMARY KEY(user_id, question_id)
  );

  CREATE TABLE IF NOT EXISTS question_schedule (
    user_id TEXT,
    question_id INTEGER,
    schedule_type TEXT,
    next_review INTEGER,
    last_review INTEGER,
    interval_days INTEGER,
    PRIMARY KEY(user_id, question_id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT,
    question_id INTEGER,
    created_at INTEGER,
    PRIMARY KEY(user_id, question_id)
  );

  CREATE TABLE IF NOT EXISTS notes (
    user_id TEXT,
    question_id INTEGER,
    note TEXT,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY,
    auto_next INTEGER,
    auto_next_seconds INTEGER,
    tts_enabled INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_subject
  ON questions(subject_id);

  CREATE INDEX IF NOT EXISTS idx_topic
  ON questions(topic_id);

  CREATE INDEX IF NOT EXISTS idx_review
  ON question_schedule(next_review);

  `);

}