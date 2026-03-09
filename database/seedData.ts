import { Platform } from "react-native";
import { db } from "./db";

export async function seedData(){

  if (Platform.OS === "web" || !db) {
    return;
  }

  await db.execAsync(`

  INSERT OR IGNORE INTO users(id,name) VALUES
  ('bhavi','Bhavi'),
  ('madhu','Madhu'),
  ('test','Test User');

  INSERT OR IGNORE INTO subjects(name) VALUES
  ('Mathematics'),
  ('Science'),
  ('English'),
  ('Hindi'),
  ('Social Science'),
  ('Computer');

  INSERT OR IGNORE INTO topics(subject_id,name) VALUES
  (1,'Algebra'),
  (1,'Linear Equations'),
  (1,'Mensuration'),
  (2,'Crop Production'),
  (2,'Microorganisms'),
  (3,'Grammar'),
  (3,'Comprehension');

  `);

}