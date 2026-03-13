// hooks/usePractice.ts

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react"

import { PracticeController } from "../controllers/practiceController"
import { ReviewRating } from "../engine/scheduler/spacedRepetition"

import { PracticeResult } from "../types/practiceResult"
import { Question } from "../types/question"

export function usePractice(controller: PracticeController | null) {

  const [question, setQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState<PracticeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const autoNextTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    )
  const isSubmittingRef = useRef(false)

  const [stats, setStats] = useState({
    attempts: 0,
    correct: 0
  })

  const safeController = controller

  const startPractice = useCallback(async () => {

    if (!safeController) return

    setLoading(true)

    const q = await safeController.startPractice()

    setQuestion(q)
    setAnswer("")
    setResult(null)

    setLoading(false)

  }, [safeController])

  const submitAnswer = useCallback(async (
    rating: ReviewRating
  ) => {

    if (
      !safeController ||
      !question ||
      result ||
      isSubmittingRef.current
    ) {
      return
    }

    isSubmittingRef.current = true

    let res: Awaited<
      ReturnType<PracticeController["submitAnswer"]>
    > | null = null

    try {
      res = await safeController.submitAnswer(
        answer,
        rating
      )
    } finally {
      isSubmittingRef.current = false
    }

    if (!res) return

    setResult(res)

    setScore((s) =>
      Math.max(0, s + (res.correct ? 1 : -1))
    )

    const nextStats =
      safeController.getStats()
    setStats(nextStats)

  }, [answer, question, result, safeController])

  const nextQuestion = useCallback(async () => {

    if (!safeController) return

    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current)
      autoNextTimeoutRef.current = null
    }

    const q = await safeController.nextQuestion()

    setQuestion(q)
    setAnswer("")
    setResult(null)
    isSubmittingRef.current = false

  }, [safeController])

  const autoNext = useCallback((
    delay: number = 2000
  ) => {

    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current)
    }

    autoNextTimeoutRef.current = setTimeout(() => {
      nextQuestion()
    }, delay)

  }, [nextQuestion])

  const resetSession = useCallback(() => {

    if (!safeController) return

    safeController.resetSession()

    setStats({
      attempts: 0,
      correct: 0
    })
    setScore(0)

    setAnswer("")
    setResult(null)
    isSubmittingRef.current = false

  }, [safeController])

  useEffect(() => {

    if (!safeController) return

    startPractice()

  }, [safeController, startPractice])

  useEffect(() => () => {

    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current)
    }

  }, [])

  return {

    question,
    answer,
    setAnswer,

    result,
    answered: !!result,

    stats,
    score,
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

