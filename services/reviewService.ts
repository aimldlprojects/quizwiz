import { db } from "@/database/db";
import { ReviewRepository } from "@/database/reviewRepository";
import { Review } from "@/domain/entities/review";

if (!db) {
  throw new Error("Database not initialized");
}

const reviewRepository = new ReviewRepository(db);

export async function getReviewService(
  userId: number,
  questionId: number
): Promise<Review | null> {

  const record = await reviewRepository.getReview(userId, questionId);

  if (!record) return null;

  return new Review({
    userId: record.user_id,
    questionId: record.question_id,
    repetition: record.repetition,
    interval: record.interval,
    easeFactor: record.ease_factor,
    nextReview: record.next_review,
    lastResult: record.last_result
  });

}

export async function saveReviewService(
  review: Review
): Promise<void> {

  await reviewRepository.saveReview(review);

}