import { ReviewRating } from "../engine/scheduler/spacedRepetition"

export interface PracticeResult {
  correct: boolean
  correctAnswer: string | number
  rating: ReviewRating
}
