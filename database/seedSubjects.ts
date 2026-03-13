import { SQLiteDatabase } from "expo-sqlite"

export type SeededSubject = {
  id: number
  name: string
}

export const SUBJECTS = [
  "Mathematics",
  "English",
  "Science"
]

export async function seedSubjects(
  db: SQLiteDatabase
): Promise<Record<string, number>> {

  for (const name of SUBJECTS) {
    await db.runAsync(
      `
      INSERT OR IGNORE INTO subjects(name)
      VALUES (?)
      `,
      [name]
    )
  }

  const rows = await db.getAllAsync<SeededSubject>(
    `
    SELECT id, name
    FROM subjects
    WHERE name IN ('Mathematics', 'English', 'Science')
    `
  )

  return rows.reduce<Record<string, number>>(
    (accumulator, row) => {
      accumulator[row.name] = row.id
      return accumulator
    },
    {}
  )

}
