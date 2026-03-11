// engine/practice/answerEvaluator.ts

export type QuestionType =
  | "fill"
  | "mcq"
  | "true_false"
  | "numeric"

export interface Question {

  id: number

  type: QuestionType

  question: string

  answer: string | number | boolean

  options?: string[]

}

export interface EvaluationResult {

  correct: boolean

  correctAnswer: string | number | boolean

}

export class AnswerEvaluator {

  // ---------- evaluate ----------

  static evaluate(
    question: Question,
    userAnswer: any
  ): EvaluationResult {

    switch (question.type) {

      case "fill":
        return this.evaluateFill(question, userAnswer)

      case "numeric":
        return this.evaluateNumeric(question, userAnswer)

      case "mcq":
        return this.evaluateMCQ(question, userAnswer)

      case "true_false":
        return this.evaluateTrueFalse(question, userAnswer)

      default:
        return {
          correct: false,
          correctAnswer: question.answer
        }

    }

  }

  // ---------- fill ----------

  private static evaluateFill(
    question: Question,
    userAnswer: string
  ): EvaluationResult {

    const correct =
      userAnswer.trim().toLowerCase() ===
      String(question.answer).trim().toLowerCase()

    return {
      correct,
      correctAnswer: question.answer
    }

  }

  // ---------- numeric ----------

  private static evaluateNumeric(
    question: Question,
    userAnswer: number
  ): EvaluationResult {

    const correct =
      Number(userAnswer) === Number(question.answer)

    return {
      correct,
      correctAnswer: question.answer
    }

  }

  // ---------- mcq ----------

  private static evaluateMCQ(
    question: Question,
    userAnswer: string
  ): EvaluationResult {

    const correct =
      userAnswer === question.answer

    return {
      correct,
      correctAnswer: question.answer
    }

  }

  // ---------- true false ----------

  private static evaluateTrueFalse(
    question: Question,
    userAnswer: boolean
  ): EvaluationResult {

    const correct =
      Boolean(userAnswer) === Boolean(question.answer)

    return {
      correct,
      correctAnswer: question.answer
    }

  }

}