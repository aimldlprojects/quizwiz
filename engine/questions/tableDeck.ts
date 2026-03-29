import { generateLearnCardsForTopic } from "./questionFactory"

export type TableDeckCard = {
  id: number
  question: string
  answer: string | number
  type?: string
}

export const TABLE_TOPIC_KEYS = new Set([
  "multiplication_tables",
  "tables_1_5",
  "tables_6_10",
  "tables_11_15",
  "tables_16_20"
])

export function isTableTopicKey(
  topicKey: string | null | undefined
) {
  return Boolean(
    topicKey && TABLE_TOPIC_KEYS.has(topicKey)
  )
}

export function getTableDeck(
  topicKey: string
): TableDeckCard[] {
  return generateLearnCardsForTopic(topicKey)
}

export class TableDeckSession {
  private topicKey: string | null = null
  private deck: TableDeckCard[] = []
  private cursor = 0

  load(topicKey: string) {
    if (this.topicKey === topicKey) {
      return
    }

    this.topicKey = topicKey
    this.deck = getTableDeck(topicKey)
    this.cursor = 0
  }

  take(limit: number) {
    const nextCards = this.deck.slice(
      this.cursor,
      this.cursor + limit
    )

    this.cursor += nextCards.length

    return nextCards
  }

  remaining() {
    return Math.max(0, this.deck.length - this.cursor)
  }

  reset() {
    this.topicKey = null
    this.deck = []
    this.cursor = 0
  }
}
