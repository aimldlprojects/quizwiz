import { Review } from "../entities/review"
import { Rating } from "../valueObjects/rating"

export class ReviewSchedulerService {

  schedule(review: Review, rating: Rating) {

    if (rating === Rating.AGAIN) {

      review.repetition = 0
      review.interval = 1

    }

    if (rating === Rating.GOOD) {

      review.repetition += 1
      review.interval *= 2

    }

    review.nextReview = Date.now() + review.interval * 86400000

    review.lastResult = rating

    return review

  }

}