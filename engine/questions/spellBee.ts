const SPELLING_QUESTION_TYPES = new Set([
  "english-spell-bee",
  "science-spelling",
])

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function isSpellingQuestionType(
  type: string | null | undefined
) {
  if (!type) {
    return false
  }

  return SPELLING_QUESTION_TYPES.has(type)
}

export function maskSpellingWordInPrompt(
  prompt: string,
  targetWord: string
) {
  const rawPrompt = (prompt ?? "").trim()
  const rawTarget = (targetWord ?? "").trim()

  if (!rawPrompt || !rawTarget) {
    return prompt
  }

  const escapedTarget = escapeRegExp(rawTarget)
  const boundaryRegex = new RegExp(
    `\\b${escapedTarget}\\b`,
    "gi"
  )
  const boundaryMasked = rawPrompt.replace(
    boundaryRegex,
    "_____"
  )

  if (boundaryMasked !== rawPrompt) {
    return boundaryMasked
  }

  const fallbackRegex = new RegExp(
    escapedTarget,
    "gi"
  )
  return rawPrompt.replace(fallbackRegex, "_____")
}
