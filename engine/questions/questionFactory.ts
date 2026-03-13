import {
  GeneratedQuestion,
  generateAdditionQuestion,
  generateDivisionQuestion,
  generateRandomTableQuestion,
  generateSubtractionQuestion,
  generateTableQuestions,
  generateWordProblemQuestion
} from "./questionGenerator"

export function generateQuestionForTopic(
  topicKey: string
): GeneratedQuestion | null {

  switch (topicKey) {
    case "multiplication_tables":
      return generateRandomTableQuestion()
    case "tables_1_5":
      return generateRandomTableQuestion(1, 5)
    case "tables_6_10":
      return generateRandomTableQuestion(6, 10)
    case "tables_11_15":
      return generateRandomTableQuestion(11, 15)
    case "tables_16_20":
      return generateRandomTableQuestion(16, 20)
    case "addition":
      return generateAdditionQuestion()
    case "subtraction":
      return generateSubtractionQuestion()
    case "division":
      return generateDivisionQuestion()
    case "word_problems":
      return generateWordProblemQuestion()
    default:
      return null
  }

}

export function generateQuestionBatch(
  topicKey: string,
  limit: number
) {

  const questions: GeneratedQuestion[] = []
  const seenIds = new Set<number>()
  let attempts = 0

  while (
    questions.length < limit &&
    attempts < limit * 10
  ) {
    attempts += 1

    const question =
      generateQuestionForTopic(topicKey)

    if (!question) {
      break
    }

    if (seenIds.has(question.id)) {
      continue
    }

    seenIds.add(question.id)
    questions.push(question)
  }

  return questions

}

export function generateLearnCardsForTopic(
  topicKey: string
) {

  switch (topicKey) {
    case "multiplication_tables":
      return generateTableQuestions()
    case "tables_1_5":
      return generateTableQuestions(1, 5)
    case "tables_6_10":
      return generateTableQuestions(6, 10)
    case "tables_11_15":
      return generateTableQuestions(11, 15)
    case "tables_16_20":
      return generateTableQuestions(16, 20)
    default:
      return []
  }

}
