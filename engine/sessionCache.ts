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

}