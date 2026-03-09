import { Platform } from "react-native";
import { db } from "./db";

function isDBReady(){
  return Platform.OS !== "web" && db;
}

export async function getUsers(){

  if(!isDBReady()) return [];

  return await db.getAllAsync(`
    SELECT * FROM users
  `);

}

export async function getSubjectsWithQuestions(){

  if (!db) return [];

  return await db.getAllAsync(`
    SELECT id,name FROM subjects
    ORDER BY name
  `);

}

export async function getTopics(subjectId:number){

  if(!isDBReady()) return [];

  return await db.getAllAsync(
    `SELECT id,name FROM topics WHERE subject_id=?`,
    [subjectId]
  );

}

export async function getQuestions(subjectId:number,topicId:number,limit=10){

  if(!isDBReady()) return [];

  return await db.getAllAsync(
    `SELECT *
     FROM questions
     WHERE subject_id=? AND topic_id=?
     ORDER BY display_order
     LIMIT ?`,
    [subjectId,topicId,limit]
  );

}

export async function getSettings(userId: string) {

  if (!db) return null;

  const res = await db.getFirstAsync(
    `SELECT * FROM settings WHERE user_id=?`,
    [userId]
  );

  return res;

}

export async function saveSettings(userId: string, autoNext: number, autoTime: number, tts: number) {

  if (!db) return;

  await db.runAsync(
    `
INSERT OR REPLACE INTO settings
(user_id,auto_next,auto_next_seconds,tts_enabled)
VALUES (?,?,?,?)
`,
    [userId, autoNext, autoTime, tts]
  );

}