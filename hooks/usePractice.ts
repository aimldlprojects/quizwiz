// hooks/usePractice.ts

import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react"

import { PracticeController } from "../controllers/practiceController"
import { ReviewRating } from "../engine/scheduler/spacedRepetition"
import { Question } from "../engine/practice/questionQueue"

import { PracticeResult } from "../types/practiceResult"

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
  const [remainingCards, setRemainingCards] =
    useState(0)

  const safeController = controller

  const startPractice = useCallback(async () => {

    if (!safeController) return

    setLoading(true)

    const q = await safeController.startPractice()

    setQuestion(q)
    setAnswer("")
    setResult(null)
    const currentStats = safeController.getStats()
    setStats({
      attempts: currentStats.attempts,
      correct: currentStats.correct
    })
    setRemainingCards(
      safeController.getRemainingCards()
    )

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
    setStats({
      attempts: nextStats.attempts,
      correct: nextStats.correct
    })

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
    setRemainingCards(
      safeController.getRemainingCards()
    )

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

    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current)
      autoNextTimeoutRef.current = null
    }

    safeController.resetSession()

    setStats({
      attempts: 0,
      correct: 0
    })
    setScore(0)
    setRemainingCards(
      safeController.getRemainingCards()
    )

    setAnswer("")
    setResult(null)
    isSubmittingRef.current = false

  }, [safeController])

  const restartPractice = useCallback(async () => {
    resetSession()
    await startPractice()
  }, [resetSession, startPractice])

  useEffect(() => {

    if (!safeController) return

    startPractice()

  }, [safeController, startPractice])

  useEffect(() => {
    return () => {
      void safeController?.persistSessionState()
    }
  }, [safeController])

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
    remainingCards,

    loading,

    startPractice,
    restartPractice,
    submitAnswer,
    nextQuestion,
    autoNext,
    resetSession

  }

}

