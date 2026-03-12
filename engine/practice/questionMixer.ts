import { ReviewRepository } from "../../database/reviewRepository"

/*
--------------------------------------------------
Question Mixer
--------------------------------------------------

Mixes:
• Due review cards
• Failed cards
• New cards

--------------------------------------------------
*/

export class QuestionMixer {

  private repo: ReviewRepository
  private userId: number

  constructor(
    repo: ReviewRepository,
    userId: number
  ) {

    this.repo = repo
    this.userId = userId

  }

  /*
  --------------------------------------------------
  Get Mixed Question Set
  --------------------------------------------------
  */

  async getMixedQuestions() {

    const due =
      await this.repo.getDueReviews(
        this.userId,
        10
      )

    const failed =
      await this.repo.getFailedQuestions(
        this.userId,
        5
      )

    const newCards =
      await this.repo.getNewQuestions(
        this.userId,
        10
      )

    const all = [
      ...failed,
      ...due,
      ...newCards
    ]

    return this.shuffle(all)

  }

  /*
  --------------------------------------------------
  Shuffle Questions
  --------------------------------------------------
  */

  private shuffle(arr: any[]) {

    for (
      let i = arr.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() * (i + 1)
        )

      const tmp = arr[i]

      arr[i] = arr[j]

      arr[j] = tmp

    }

    return arr

  }

}