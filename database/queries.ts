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

  if(!isDBReady()) return [];

  return await db.getAllAsync(`
    SELECT DISTINCT s.id, s.name
    FROM subjects s
    JOIN questions q ON q.subject_id = s.id
    ORDER BY s.name
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