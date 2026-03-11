// services/syncService.ts

import * as FileSystem from "expo-file-system/legacy"
import { Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import * as SQLite from "expo-sqlite"

export class SyncService {

  private db: SQLite.SQLiteDatabase

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db
  }

    // -------------------------------------------------
    // Backup Entry Point
    // -------------------------------------------------

    async backup(): Promise<void> {

        try {

            const path = await this.exportData()

            console.log("Backup saved at:", path)

        } catch (err) {

            console.error("Backup failed:", err)

        }

        }


    // ---------- export data ----------

    async exportData(): Promise<string> {

        const reviews =
        await this.db.getAllAsync(
            `SELECT * FROM reviews`
        )

        const questions =
        await this.db.getAllAsync(
            `SELECT * FROM questions`
        )

        const data = {
        reviews,
        questions,
        exportedAt: Date.now()
        }

        const json =
        JSON.stringify(data, null, 2)

        const path =
            Paths.document +
            "quizwiz_backup.json"

        await FileSystem.writeAsStringAsync(
        path,
        json
        )

        return path
    }

    // ---------- share backup ----------

    async shareBackup() {

        const path = await this.exportData()

        if (await Sharing.isAvailableAsync()) {

        await Sharing.shareAsync(path)

        }

    }

    // ---------- import backup ----------

    async importData(json: string) {

        const data = JSON.parse(json)

        if (!data.reviews) return

        for (const r of data.reviews) {

        await this.db.runAsync(
            `
            INSERT OR REPLACE INTO reviews
            (
            user_id,
            question_id,
            repetition,
            interval,
            ease_factor,
            next_review,
            last_result
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
            r.user_id,
            r.question_id,
            r.repetition,
            r.interval,
            r.ease_factor,
            r.next_review,
            r.last_result
            ]
        )

        }

    }

}