export type GeneratedQuestion = {
  id: number
  topic: string
  type: string
  question: string
  answer: number | string
}

function randomBetween(
  min: number,
  max: number
) {

  return (
    Math.floor(Math.random() * (max - min + 1)) +
    min
  )

}

export function generateTableQuestions(
  minTable: number = 1,
  maxTable: number = 20
) {

  const questions: GeneratedQuestion[] = []

  for (
    let a = minTable;
    a <= maxTable;
    a++
  ) {
    for (let b = 1; b <= 10; b++) {
      questions.push({
        id: Number(`${a}${b}`),
        topic: "tables",
        type: "math-tables",
        question: `${a} x ${b}`,
        answer: a * b
      })
    }
  }

  return questions

}

export function generateRandomTableQuestion(
  minTable: number = 1,
  maxTable: number = 20
) {

  const a = randomBetween(minTable, maxTable)
  const b = randomBetween(1, 10)

  return {
    id: Number(`${a}${b}`),
    topic: "tables",
    type: "math-tables",
    question: `${a} x ${b}`,
    answer: a * b
  }

}

export function generateAdditionQuestion() {

  const a = randomBetween(1, 50)
  const b = randomBetween(1, 50)

  return {
    id: Number(`1${a}${b}`),
    topic: "addition",
    type: "math-addition",
    question: `${a} + ${b}`,
    answer: a + b
  }

}

export function generateSubtractionQuestion() {

  const a = randomBetween(10, 60)
  const b = randomBetween(1, a - 1)

  return {
    id: Number(`2${a}${b}`),
    topic: "subtraction",
    type: "math-subtraction",
    question: `${a} - ${b}`,
    answer: a - b
  }

}

export function generateDivisionQuestion() {

  const divisor = randomBetween(1, 10)
  const quotient = randomBetween(1, 12)
  const dividend = divisor * quotient

  return {
    id: Number(`3${dividend}${divisor}`),
    topic: "division",
    type: "math-division",
    question: `${dividend} / ${divisor}`,
    answer: quotient
  }

}

export function generateWordProblemQuestion() {

  const addends = [
    {
      subject: "stickers",
      a: 4,
      b: 5
    },
    {
      subject: "marbles",
      a: 7,
      b: 3
    },
    {
      subject: "books",
      a: 6,
      b: 2
    }
  ]

  const item =
    addends[randomBetween(0, addends.length - 1)]

  return {
    id: Number(`4${item.a}${item.b}`),
    topic: "word_problems",
    type: "word-problem",
    question: `Sam has ${item.a} ${item.subject} and gets ${item.b} more. How many ${item.subject} now?`,
    answer: item.a + item.b
  }

}
