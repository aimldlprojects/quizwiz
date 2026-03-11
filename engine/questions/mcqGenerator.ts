// engine/questions/mcqGenerator.ts

export interface MCQQuestion {

  id: number

  type: "mcq"

  question: string

  options: string[]

  answer: string

}

export interface MCQOptions {

  question: string

  correctAnswer: string

  distractors: string[]

}

export class MCQGenerator {

  // ---------- create MCQ ----------

  static create(options: MCQOptions): MCQQuestion {

    const choices = [
      options.correctAnswer,
      ...options.distractors
    ]

    const shuffled =
      this.shuffle(choices)

    return {

      id: Date.now(),

      type: "mcq",

      question: options.question,

      options: shuffled,

      answer: options.correctAnswer

    }

  }

  // ---------- shuffle ----------

  private static shuffle(array: string[]): string[] {

    const arr = [...array]

    for (let i = arr.length - 1; i > 0; i--) {

      const j =
        Math.floor(Math.random() * (i + 1))

      ;[arr[i], arr[j]] = [arr[j], arr[i]]

    }

    return arr

  }

}