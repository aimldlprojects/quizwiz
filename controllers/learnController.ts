// controllers/learnController.ts

import { TablesGenerator } from "../engine/questions/tablesGenerator"
import { ttsService } from "../services/ttsService"

export interface LearnCard {

  id: number

  question: string
  answer: number

}

export class LearnController {

  private cards: LearnCard[] = []

  private index: number = 0

  // ---------- load cards ----------

  loadTables(table: number) {

    const questions =
      TablesGenerator.generateTable(table)

    this.cards = questions.map(q => ({
      id: q.id,
      question: q.question,
      answer: q.answer
    }))

    this.index = 0

  }

  // ---------- get current ----------

  getCurrentCard(): LearnCard | null {

    if (this.cards.length === 0) return null

    return this.cards[this.index]

  }

  // ---------- next ----------

  next(): LearnCard | null {

    if (this.index < this.cards.length - 1) {
      this.index += 1
    }

    return this.getCurrentCard()

  }

  // ---------- previous ----------

  previous(): LearnCard | null {

    if (this.index > 0) {
      this.index -= 1
    }

    return this.getCurrentCard()

  }

  // ---------- speak question ----------

  speak() {

    const card = this.getCurrentCard()

    if (!card) return

    ttsService.speak(card.question)

  }

  // ---------- progress ----------

  getProgress() {

    return {
      current: this.index + 1,
      total: this.cards.length
    }

  }

  // ---------- reset ----------

  reset() {

    this.cards = []
    this.index = 0

  }

}