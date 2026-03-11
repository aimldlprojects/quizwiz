// services/ttsService.ts

import * as Speech from "expo-speech"

class TTSService {

  private enabled: boolean = true
  private speaking: boolean = false

  // ---------- enable ----------

  enable() {
    this.enabled = true
  }

  // ---------- disable ----------

  disable() {
    this.enabled = false
    this.stop()
  }

  // ---------- toggle ----------

  toggle() {
    this.enabled = !this.enabled

    if (!this.enabled) {
      this.stop()
    }

    return this.enabled
  }

  // ---------- speak ----------

  speak(text: string) {

    if (!this.enabled) return

    if (this.speaking) {
      Speech.stop()
    }

    this.speaking = true

    Speech.speak(text, {
      language: "en",
      rate: 0.9,
      pitch: 1.0,
      onDone: () => {
        this.speaking = false
      },
      onStopped: () => {
        this.speaking = false
      }
    })

  }

  // ---------- stop ----------

  stop() {

    Speech.stop()

    this.speaking = false
  }

  // ---------- status ----------

  isEnabled(): boolean {
    return this.enabled
  }

}

export const ttsService = new TTSService()