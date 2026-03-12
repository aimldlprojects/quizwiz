export class Review {

  userId: number
  questionId: number

  repetition: number
  interval: number
  easeFactor: number
  nextReview: number
  lastResult: string

  constructor(data: {

    userId: number
    questionId: number
    repetition: number
    interval: number
    easeFactor: number
    nextReview: number
    lastResult: string

  }) {

    this.userId = data.userId
    this.questionId = data.questionId

    this.repetition = data.repetition
    this.interval = data.interval
    this.easeFactor = data.easeFactor

    this.nextReview = data.nextReview
    this.lastResult = data.lastResult

  }

}