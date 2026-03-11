// engine/questions/batchLoader.ts

import { TablesGenerator } from "./tablesGenerator"

export interface Question {

  id: number

  type: string

  question: string

  answer: any

  options?: string[]

}

export interface BatchLoaderOptions {

  source?: "tables" | "mixed"

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

      default:
        return this.loadTablesBatch()

    }

  }

  // ---------- tables batch ----------

  private loadTablesBatch(): Question[] {

    return TablesGenerator.generateBatch(
      this.batchSize
    )

  }

  // ---------- mixed batch ----------

  private loadMixedBatch(): Question[] {

    const questions: Question[] = []

    const tables =
      TablesGenerator.generateBatch(
        Math.floor(this.batchSize * 0.7)
      )

    questions.push(...tables)

    return questions

  }

}