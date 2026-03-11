// services/timerService.ts

class TimerService {

  private timer: ReturnType<typeof setTimeout> | null = null

  // ---------- start timer ----------

  start(delay: number, callback: () => void) {

    this.clear()

    this.timer = setTimeout(() => {

      this.timer = null
      callback()

    }, delay)

  }

  // ---------- clear timer ----------

  clear() {

    if (this.timer) {

      clearTimeout(this.timer)
      this.timer = null

    }

  }

  // ---------- restart ----------

  restart(delay: number, callback: () => void) {

    this.clear()
    this.start(delay, callback)

  }

  // ---------- check running ----------

  isRunning(): boolean {

    return this.timer !== null

  }

}

export const timerService = new TimerService()