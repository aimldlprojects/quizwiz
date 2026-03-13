// controllers/learnController.ts

import { TablesGenerator } from "../engine/questions/tablesGenerator"
import { ttsService } from "../services/ttsService"

export interface LearnCard {

  id: number

  question: string
  answer: string | number

}

export type LearnFeedback =
  | "very_hard"
  | "hard"
  | "easy"
  | "very_easy"

export class LearnController {

  private cards: LearnCard[] = []

  private index: number = 0

  // ---------- load cards ----------

  loadCards(cards: LearnCard[]) {

    this.cards = cards
    this.index = 0

  }

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

  speak(text?: string) {

    const spokenText =
      text ??
      this.getCurrentCard()?.question

    if (!spokenText) return

    ttsService.speak(spokenText)

  }

  rateCurrentCard(
    feedback: LearnFeedback
  ): LearnCard | null {

    if (this.cards.length === 0) {
      return null
    }

    const currentCard =
      this.cards[this.index]

    if (!currentCard) {
      return null
    }

    const offsets: Record<
      LearnFeedback,
      number
    > = {
      very_hard: 1,
      hard: 3,
      easy: 6,
      very_easy: 10
    }

    this.cards.splice(this.index, 1)

    const targetIndex = Math.min(
      this.index + offsets[feedback],
      this.cards.length
    )

    this.cards.splice(
      targetIndex,
      0,
      currentCard
    )

    if (this.index >= this.cards.length) {
      this.index = Math.max(
        0,
        this.cards.length - 1
      )
    }

    return this.getCurrentCard()

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
