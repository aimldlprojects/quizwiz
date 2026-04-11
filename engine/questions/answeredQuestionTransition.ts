import {
  ReviewPriorityStageKey,
  getReviewPriorityStageFromReview
} from "./reviewPriority"

export type PendingStageCounts = Record<
  ReviewPriorityStageKey,
  number
>

export type AnsweredQuestionStage = {
  key: string
  label?: string
}

export type AnsweredQuestionReview = {
  repetition?: number | null
  next_review?: number | null
  last_result?: string | null
  nextReview?: number | null
  lastResult?: string | null
}

export function applyAnsweredQuestionTransition(
  params: {
    questionId: number
    correct: boolean
    stageForQuestion: AnsweredQuestionStage | null | undefined
    nextReview?: AnsweredQuestionReview | null
    pendingCounts: PendingStageCounts
    answeredTransitionIds: Set<number>
  }
): {
  applied: boolean
  pendingCounts: PendingStageCounts
} {
  const {
    questionId,
    correct,
    stageForQuestion,
    nextReview,
    pendingCounts,
    answeredTransitionIds
  } = params

  if (
    answeredTransitionIds.has(questionId) ||
    !stageForQuestion
  ) {
    return {
      applied: false,
      pendingCounts
    }
  }

  const sourceStageKey =
    stageForQuestion.key as ReviewPriorityStageKey
  const destinationStageKey = correct
    ? nextReview
      ? getReviewPriorityStageFromReview(nextReview)
      : sourceStageKey
    : "wrong"

  const nextCounts = {
    ...pendingCounts
  }

  nextCounts[sourceStageKey] = Math.max(
    0,
    (nextCounts[sourceStageKey] ?? 0) - 1
  )

  if (destinationStageKey) {
    nextCounts[destinationStageKey] =
      (nextCounts[destinationStageKey] ?? 0) + 1
  }

  answeredTransitionIds.add(questionId)

  return {
    applied: true,
    pendingCounts: nextCounts
  }
}
