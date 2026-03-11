import { Platform } from "react-native";
import { db } from "../database/db";

export async function seedData(){

  if (Platform.OS === "web" || !db) return;
  console.log("Running seed SQL")
  await db.execAsync(`

    DELETE FROM subjects
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM subjects
      GROUP BY name
    );

    DELETE FROM topics
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM topics
      GROUP BY name
    );

    INSERT OR IGNORE INTO users(id,name) VALUES
    (1,'Bhavi'),
    (2,'Madhu'),
    (3,'Test User');

    INSERT OR IGNORE INTO subjects(name) VALUES
    ('Mathematics'),
    ('Science'),
    ('English'),
    ('Hindi'),
    ('Social Science'),
    ('Computer');

    INSERT OR IGNORE INTO topics(subject_id,name) VALUES
    (1,'Tables'),
    (1,'Algebra'),
    (1,'Mensuration'),
    (2,'Physics'),
    (2,'Chemistry'),
    (3,'Grammar'),
    (3,'Comprehension');

    `);

    }