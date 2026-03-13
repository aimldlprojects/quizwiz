// hooks/usePractice.ts

import { useEffect, useState } from "react"

import { PracticeController } from "../controllers/practiceController"
import { ReviewRating } from "../engine/scheduler/spacedRepetition"

import { PracticeResult } from "../types/practiceResult"
import { Question } from "../types/question"

export function usePractice(controller: PracticeController | null) {

  const [question, setQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState<PracticeResult | null>(null)
  const [loading, setLoading] = useState(false)

  const [stats, setStats] = useState({
    attempts: 0,
    correct: 0
  })

  const safeController = controller


  // ---------- start practice ----------

  async function startPractice() {

    if (!safeController) return

    setLoading(true)

    const q = await safeController.startPractice()

    setQuestion(q)
    setAnswer("")
    setResult(null)

    setLoading(false)

  }


  // ---------- submit answer ----------

  async function submitAnswer(rating: ReviewRating) {

    if (!safeController || !question) return

    const res =
      await safeController.submitAnswer(answer, rating)

    if (!res) return

    setResult(res)

    const s = safeController.getStats()
    setStats(s)

  }


  // ---------- next question ----------

  async function nextQuestion() {

    if (!safeController) return

    const q = await safeController.nextQuestion()

    setQuestion(q)
    setAnswer("")
    setResult(null)

  }


  // ---------- auto next ----------

  function autoNext(delay: number = 2000) {

    setTimeout(() => {
      nextQuestion()
    }, delay)

  }


  // ---------- accuracy ----------

  function getAccuracy() {

    if (!safeController) return 0

    return safeController.getAccuracy()

  }


  // ---------- reset ----------

  function resetSession() {

    if (!safeController) return

    safeController.resetSession()

    setStats({
      attempts: 0,
      correct: 0
    })

    setAnswer("")
    setResult(null)

  }


  // ---------- init ----------

  useEffect(() => {

    if (!safeController) return

    startPractice()

  }, [safeController])


  return {

    question,
    answer,
    setAnswer,

    result,

    stats,
    accuracy:
      stats.attempts === 0
        ? 0
        : Math.round(
            (stats.correct / stats.attempts) * 100
          ),

    loading,

    startPractice,
    submitAnswer,
    nextQuestion,
    autoNext,
    resetSession

  }

}

