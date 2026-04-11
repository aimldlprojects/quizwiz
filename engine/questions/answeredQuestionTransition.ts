import { ReviewPriorityStageKey } from "./reviewPriority"

export type PendingStageCounts = Record<
  ReviewPriorityStageKey,
  number
>

export type AnsweredQuestionStage = {
  key: string
  label?: string
}

export function applyAnsweredQuestionTransition(
  params: {
    questionId: number
    correct: boolean
    stageForQuestion: AnsweredQuestionStage | null | undefined
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

  const nextCounts = {
    ...pendingCounts
  }

  nextCounts[sourceStageKey] = Math.max(
    0,
    (nextCounts[sourceStageKey] ?? 0) - 1
  )

  if (!correct) {
    nextCounts.wrong =
      (nextCounts.wrong ?? 0) + 1
  }

  answeredTransitionIds.add(questionId)

  return {
    applied: true,
    pendingCounts: nextCounts
  }
}
