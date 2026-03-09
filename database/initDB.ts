import { Platform } from "react-native";
import { db } from "./db";

export async function initDB() {

  if (Platform.OS === "web" || !db) {
    return;
  }

  await db.execAsync(`

CREATE TABLE IF NOT EXISTS users (
id TEXT PRIMARY KEY,
name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT UNIQUE
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
question TEXT,
answer TEXT
);

CREATE TABLE IF NOT EXISTS user_progress (
user_id TEXT,
question_id TEXT,

correct_count INTEGER DEFAULT 0,
wrong_count INTEGER DEFAULT 0,

ease_factor REAL DEFAULT 2.5,
interval INTEGER DEFAULT 0,
next_review INTEGER DEFAULT 0,

last_answer_time INTEGER,

PRIMARY KEY(user_id,question_id)
);

`);

}