// engine/gamification/streakEngine.ts

export interface StreakState {

  currentStreak: number
  longestStreak: number

  lastPracticeDate: string | null

}

export class StreakEngine {

  private state: StreakState = {

    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null

  }

  // ---------- record practice ----------

  recordPractice(date: Date = new Date()) {

    const today =
      date.toISOString().split("T")[0]

    const yesterday =
      this.getYesterday(today)

    if (!this.state.lastPracticeDate) {

      this.state.currentStreak = 1

    } else if (this.state.lastPracticeDate === today) {

      return

    } else if (this.state.lastPracticeDate === yesterday) {

      this.state.currentStreak += 1

    } else {

      this.state.currentStreak = 1

    }

    this.state.lastPracticeDate = today

    if (
      this.state.currentStreak >
      this.state.longestStreak
    ) {

      this.state.longestStreak =
        this.state.currentStreak

    }

  }

  // ---------- get streak ----------

  getCurrentStreak(): number {

    return this.state.currentStreak

  }

  getLongestStreak(): number {

    return this.state.longestStreak

  }

  // ---------- helper ----------

  private getYesterday(dateStr: string): string {

    const d = new Date(dateStr)

    d.setDate(d.getDate() - 1)

    return d.toISOString().split("T")[0]

  }

}