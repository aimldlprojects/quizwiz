import { generateQuestionBatch } from "./questionFactory"

export interface Question {

  id: number

  type: string

  question: string

  answer: any

  options?: string[]

}

export interface BatchLoaderOptions {

  source?:
    | "tables"
    | "mixed"
    | "addition"
    | "subtraction"
    | "division"
    | "word_problems"

  batchSize?: number

}

export class BatchLoader {

  private batchSize: number
  private source: string

  constructor(options: BatchLoaderOptions = {}) {

    this.batchSize = options.batchSize ?? 10
    this.source = options.source ?? "tables"

  }

  // ---------- load batch ----------

  async loadBatch(): Promise<Question[]> {

    switch (this.source) {

      case "tables":
        return this.loadTablesBatch()

      case "mixed":
        return this.loadMixedBatch()

      case "addition":
      case "subtraction":
      case "division":
      case "word_problems":
        return generateQuestionBatch(
          this.source,
          this.batchSize
        )

      default:
        return this.loadTablesBatch()

    }

  }

  // ---------- tables batch ----------

  private loadTablesBatch(): Question[] {

    return generateQuestionBatch(
      "multiplication_tables",
      this.batchSize
    )

  }

  // ---------- mixed batch ----------

  private loadMixedBatch(): Question[] {

    const questions: Question[] = []

    questions.push(
      ...generateQuestionBatch(
        "multiplication_tables",
        Math.floor(this.batchSize * 0.4)
      )
    )
    questions.push(
      ...generateQuestionBatch(
        "addition",
        Math.floor(this.batchSize * 0.2)
      )
    )
    questions.push(
      ...generateQuestionBatch(
        "subtraction",
        Math.floor(this.batchSize * 0.2)
      )
    )
    questions.push(
      ...generateQuestionBatch(
        "division",
        this.batchSize - questions.length
      )
    )

    return questions

  }

}
