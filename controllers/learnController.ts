// controllers/learnController.ts

import { TablesGenerator } from "../engine/questions/tablesGenerator"
import { ttsService } from "../services/ttsService"
import { shuffleArray } from "../engine/questions/shuffle"

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
  private completed: boolean = false

  // ---------- load cards ----------

  loadCards(cards: LearnCard[]) {

    this.cards = cards
    this.index = 0
    this.completed = false

  }

  setCurrentIndex(index: number) {

    if (this.cards.length === 0) {
      this.index = 0
      this.completed = false
      return
    }

    const normalizedIndex =
      Math.max(
        0,
        Math.min(
          Math.floor(index),
          this.cards.length - 1
        )
      )

    this.index = normalizedIndex
    this.completed = false

  }

  getCurrentIndex() {

    return this.index

  }

  getCurrentCardId() {

    return this.getCurrentCard()?.id ?? null

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
    if (this.completed) return null

    return this.cards[this.index]

  }

  // ---------- next ----------

  next(): LearnCard | null {

    if (this.cards.length === 0) {
      return null
    }

    if (this.index < this.cards.length - 1) {
      this.index += 1
      this.completed = false
      return this.getCurrentCard()
    }

    this.completed = true
    return null

  }

  // ---------- previous ----------

  previous(): LearnCard | null {

    if (this.index > 0) {
      this.index -= 1
      this.completed = false
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

    this.completed = false

    return this.getCurrentCard()

  }

  shuffleRemaining() {

    if (this.index >= this.cards.length - 1) {
      return
    }

    const completed = this.cards.slice(0, this.index)
    const remaining = shuffleArray(
      this.cards.slice(this.index)
    )

    this.cards = [
      ...completed,
      ...remaining
    ]

    this.index = completed.length

  }

  // ---------- progress ----------

  getProgress() {

    return {
      current: this.completed
        ? this.cards.length
        : this.index + 1,
      total: this.cards.length
    }

  }

  // ---------- reset ----------

  reset() {

    this.cards = []
    this.index = 0
    this.completed = false

  }

}
