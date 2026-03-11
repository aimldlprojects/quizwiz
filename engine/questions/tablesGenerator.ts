// engine/questions/tablesGenerator.ts

export interface TableQuestion {

  id: number

  type: "numeric"

  question: string

  answer: number

  a: number
  b: number

}

export interface TablesOptions {

  minTable?: number
  maxTable?: number

  minMultiplier?: number
  maxMultiplier?: number

}

export class TablesGenerator {

  // ---------- random question ----------

  static generateRandom(
    options: TablesOptions = {}
  ): TableQuestion {

    const minTable = options.minTable ?? 1
    const maxTable = options.maxTable ?? 20

    const minMultiplier = options.minMultiplier ?? 1
    const maxMultiplier = options.maxMultiplier ?? 10

    const a =
      this.random(minTable, maxTable)

    const b =
      this.random(minMultiplier, maxMultiplier)

    return {

      id: Date.now(),

      type: "numeric",

      question: `${a} × ${b}`,

      answer: a * b,

      a,
      b

    }

  }

  // ---------- generate batch ----------

  static generateBatch(
    count: number,
    options: TablesOptions = {}
  ): TableQuestion[] {

    const questions: TableQuestion[] = []

    for (let i = 0; i < count; i++) {

      questions.push(
        this.generateRandom(options)
      )

    }

    return questions

  }

  // ---------- full table ----------

  static generateTable(
    table: number,
    upto: number = 10
  ): TableQuestion[] {

    const questions: TableQuestion[] = []

    for (let i = 1; i <= upto; i++) {

      questions.push({

        id: Number(`${table}${i}`),

        type: "numeric",

        question: `${table} × ${i}`,

        answer: table * i,

        a: table,
        b: i

      })

    }

    return questions

  }

  // ---------- helper ----------

  private static random(
    min: number,
    max: number
  ): number {

    return Math.floor(
      Math.random() * (max - min + 1)
    ) + min

  }

}