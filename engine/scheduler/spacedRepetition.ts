// engine/scheduler/spacedRepetition.ts

export type ReviewRating = "again" | "hard" | "good" | "easy"

export interface ReviewState {
    repetition: number
    interval: number
    easeFactor: number
}

export interface ReviewResult extends ReviewState {
    nextReview: number
}

const MIN_EASE_FACTOR = 1.3

function updateEaseFactor(easeFactor: number, quality: number): number {
    const newEF =
        easeFactor +
        (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    return Math.max(MIN_EASE_FACTOR, newEF)
}

function ratingToQuality(rating: ReviewRating): number {
    switch (rating) {
        case "again":
            return 1
        case "hard":
            return 3
        case "good":
            return 4
        case "easy":
            return 5
    }
}

export function calculateNextReview(
    state: ReviewState,
    rating: ReviewRating
): ReviewResult {

    const quality = ratingToQuality(rating)

    let { repetition, interval, easeFactor } = state

    if (rating === "again") {
        repetition = 0
        interval = 0.007 // ~10 minutes
    } else {

      repetition += 1

      if (repetition === 1) {
          interval = 1
      } else if (repetition === 2) {
          interval = 6
      } else {
          interval = Math.round(interval * easeFactor)
      }

      easeFactor = updateEaseFactor(easeFactor, quality)
  }

    const nextReview =
        Date.now() + interval * 24 * 60 * 60 * 1000

    return {
      repetition,
      interval,
      easeFactor,
      nextReview
  }
}