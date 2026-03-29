import { shuffleArray } from "./questions/shuffle"

export class SessionCache<T> {

  private items: T[] = []
  private index = 0

  load(items: T[]) {

    this.items = items
    this.index = 0

  }

  next(): T | null {

    if (this.index >= this.items.length) {
      return null
    }

    const item = this.items[this.index]
    this.index++

    return item

  }

  remaining(): number {

    return this.items.length - this.index

  }

  snapshot() {
    return {
      items: [...this.items],
      index: this.index
    }
  }

  restore(
    snapshot: {
      items: T[]
      index: number
    }
  ) {
    this.items = [...snapshot.items]
    this.index = Math.max(
      0,
      Math.min(snapshot.index, this.items.length)
    )
  }

  shuffleRemaining() {
    if (this.index >= this.items.length - 1) {
      return
    }

    const completed = this.items.slice(0, this.index)
    const remaining = shuffleArray(
      this.items.slice(this.index)
    )

    this.items = [
      ...completed,
      ...remaining
    ]
  }

  clear() {
    this.items = []
    this.index = 0
  }

}
