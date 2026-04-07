import { shuffleArray } from "./shuffle"

export type ReviewPriorityStageKey =
  | "wrong"
  | "due"
  | "unseen"
  | "in_progress"
  | "recently_mastered"

export type ReviewPriorityReviewSnapshot = {
  question_id: number
  repetition: number | null
  next_review: number | null
  last_result: string | null
}

export type ReviewPriorityCard = {
  id: number
  question: string
  answer: string | number
}

export const REVIEW_PRIORITY_STAGE_ORDER: ReviewPriorityStageKey[] = [
  "wrong",
  "due",
  "unseen",
  "in_progress",
  "recently_mastered"
]

export function getReviewPriorityStageLabel(
  stage: ReviewPriorityStageKey
) {
  switch (stage) {
    case "wrong":
      return "Wrong answered cards"
    case "due":
      return "Due cards"
    case "unseen":
      return "Unseen cards"
    case "in_progress":
      return "In-progress cards"
    case "recently_mastered":
      return "Recently mastered cards"
  }
}

function getCardStage(
  cardId: number,
  reviewByQuestionId: Map<number, ReviewPriorityReviewSnapshot>,
  now: number
): ReviewPriorityStageKey {
  const review = reviewByQuestionId.get(cardId)

  if (!review) {
    return "unseen"
  }

  const repetition = review.repetition ?? 0
  const nextReview = review.next_review ?? null
  const lastResult = review.last_result ?? null

  if (lastResult === "again") {
    return "wrong"
  }

  if (
    typeof nextReview === "number" &&
    nextReview > 0 &&
    nextReview <= now
  ) {
    return "due"
  }

  if (repetition < 2) {
    return "in_progress"
  }

  return "recently_mastered"
}

export function buildReviewPriorityStages(
  cards: ReviewPriorityCard[],
  reviews: ReviewPriorityReviewSnapshot[],
  options?: {
    shuffleWithinStage?: boolean
    nowMs?: number
  }
) {
  const now = options?.nowMs ?? Date.now()
  const reviewByQuestionId = new Map(
    reviews.map((review) => [
      review.question_id,
      review
    ])
  )

  const stageBuckets: Record<
    ReviewPriorityStageKey,
    ReviewPriorityCard[]
  > = {
    wrong: [],
    due: [],
    unseen: [],
    in_progress: [],
    recently_mastered: []
  }

  for (const card of cards) {
    const stage = getCardStage(
      card.id,
      reviewByQuestionId,
      now
    )
    stageBuckets[stage].push(card)
  }

  return REVIEW_PRIORITY_STAGE_ORDER.map((stage) => ({
    key: stage,
    label: getReviewPriorityStageLabel(stage),
    cards: options?.shuffleWithinStage
      ? shuffleArray(stageBuckets[stage])
      : stageBuckets[stage]
  }))
}
