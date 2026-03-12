import { Paths } from "expo-file-system"
import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"
import * as SQLite from "expo-sqlite"

import { syncReviews } from "./sync/syncReviews"

export class SyncService {

  private db: SQLite.SQLiteDatabase
    private serverUrl: string | null = null
    private userId: number | null = null

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db
  }

    /*
    --------------------------------------------------
    Configure Sync
    --------------------------------------------------
    */

    configure(
        serverUrl: string,
        userId: number
    ) {

        this.serverUrl = serverUrl
        this.userId = userId

    }

    /*
    --------------------------------------------------
    Backup Entry Point
    --------------------------------------------------
    */

    async backup(): Promise<void> {

      try {

        const path = await this.exportData()

        console.log("Backup saved at:", path)

    } catch (err) {

        console.error("Backup failed:", err)

    }

  }

    /*
    --------------------------------------------------
    Export Data
    --------------------------------------------------
    */

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

    /*
    --------------------------------------------------
    Share Backup
    --------------------------------------------------
    */

    async shareBackup() {

      const path = await this.exportData()

      if (await Sharing.isAvailableAsync()) {

        await Sharing.shareAsync(path)

    }

  }

    /*
    --------------------------------------------------
    Import Backup
    --------------------------------------------------
    */

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
          last_result,
          rev_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
              r.user_id,
              r.question_id,
              r.repetition,
              r.interval,
              r.ease_factor,
              r.next_review,
              r.last_result,
              r.rev_id ?? Date.now()
          ]
      )

    }

  }

    /*
    --------------------------------------------------
    Run Full Sync
    --------------------------------------------------
    */

    async sync(): Promise<void> {

        if (!this.serverUrl || !this.userId) {
            return
        }

        await syncReviews(
            this.db,
            this.serverUrl,
            this.userId
        )

    }

}