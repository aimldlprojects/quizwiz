// store/practiceStore.ts

import { Question } from "../engine/practice/answerEvaluator"

export interface PracticeState {

  attempts: number
  correct: number

  currentQuestion: Question | null

  started: boolean

}

class PracticeStore {

  private state: PracticeState = {

    attempts: 0,
    correct: 0,

    currentQuestion: null,

    started: false

  }

  // ---------- start session ----------

  startSession(question: Question) {

    if (!this.state.started) {

      this.state.started = true
      this.state.currentQuestion = question

    }

  }

  // ---------- set question ----------

  setQuestion(question: Question) {

    this.state.currentQuestion = question

  }

  // ---------- get question ----------

  getQuestion(): Question | null {

    return this.state.currentQuestion

  }

  // ---------- record attempt ----------

  recordAttempt(correct: boolean) {

    this.state.attempts += 1

    if (correct) {
      this.state.correct += 1
    }

  }

  // ---------- stats ----------

  getStats() {

    return {

      attempts: this.state.attempts,
      correct: this.state.correct

    }

  }

  // ---------- accuracy ----------

  getAccuracy(): number {

    if (this.state.attempts === 0) return 0

    return Math.round(
      (this.state.correct / this.state.attempts) * 100
    )

  }

  // ---------- reset ----------

  reset() {

    this.state = {

      attempts: 0,
      correct: 0,

      currentQuestion: null,

      started: false

    }

  }

}

export const practiceStore = new PracticeStore()