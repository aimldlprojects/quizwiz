import { Review } from "../domain/entities/review"
import { ReviewRating } from "../engine/scheduler/spacedRepetition"

export interface PracticeResult {
  questionId: number
  correct: boolean
  correctAnswer: string | number
  rating: ReviewRating
  review: Review
}
