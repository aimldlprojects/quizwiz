type EventHandler = (payload: any) => void

export class EventBus {

  private handlers: Map<string, EventHandler[]> = new Map()

  /*
  --------------------------------------------------
  Subscribe
  --------------------------------------------------
  */

  on(event: string, handler: EventHandler) {

    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }

    this.handlers.get(event)!.push(handler)

  }

  /*
  --------------------------------------------------
  Emit
  --------------------------------------------------
  */

  emit(event: string, payload?: any) {

    const handlers = this.handlers.get(event)

    if (!handlers) return

    handlers.forEach(handler => handler(payload))

  }

}