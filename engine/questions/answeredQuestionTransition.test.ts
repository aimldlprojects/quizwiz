import assert from "node:assert/strict"

import {
  applyAnsweredQuestionTransition,
  type PendingStageCounts
} from "./answeredQuestionTransition"

function buildPendingCounts(): PendingStageCounts {
  return {
    wrong: 1,
    due: 2,
    unseen: 3,
    in_progress: 4,
    recently_mastered: 5
  }
}

const answeredTransitionIds = new Set<number>()
const originalCounts = buildPendingCounts()

const first = applyAnsweredQuestionTransition({
  questionId: 42,
  correct: false,
  stageForQuestion: {
    key: "due"
  },
  pendingCounts: originalCounts,
  answeredTransitionIds
})

assert.equal(first.applied, true)
assert.equal(first.pendingCounts.due, 1)
assert.equal(first.pendingCounts.wrong, 2)
assert.equal(
  originalCounts.due,
  2,
  "the helper should not mutate the original counts object"
)
assert.equal(
  answeredTransitionIds.has(42),
  true,
  "the answered question id should be tracked"
)
assert.equal(
  answeredTransitionIds.has(7),
  false,
  "an unrelated question id should not be marked"
)

const duplicate = applyAnsweredQuestionTransition({
  questionId: 42,
  correct: true,
  stageForQuestion: {
    key: "wrong"
  },
  pendingCounts: first.pendingCounts,
  answeredTransitionIds
})

assert.equal(duplicate.applied, false)
assert.equal(
  duplicate.pendingCounts.due,
  1,
  "duplicate application should leave counts unchanged"
)

console.log("answeredQuestionTransition regression passed")
