import { createContext, type ReactNode, useContext, useMemo } from 'react'
import type { QuizAnswer } from '../../../../shared/quiz'

export type QuizAnswerContextValue = {
  /** The answer in the user message right after this assistant message, if it is a quiz answer. */
  answer?: QuizAnswer
  /** Sends the answer as a user message. Only set while a quiz in this message can be answered (latest message, not streaming). */
  onAnswer?: (answer: QuizAnswer, text: string) => void
  /** The conversation went on after this message, so its unanswered quizzes can no longer be answered. */
  closed?: boolean
}

const QuizAnswerContext = createContext<QuizAnswerContextValue>({})

/** What the quiz cards of one assistant message need to know about the conversation around them. */
export const QuizAnswerProvider = ({ answer, onAnswer, closed, children }: QuizAnswerContextValue & { children: ReactNode }) => {
  const value = useMemo(() => ({ answer, onAnswer, closed }), [answer, onAnswer, closed])
  return <QuizAnswerContext.Provider value={value}>{children}</QuizAnswerContext.Provider>
}

export const useQuizAnswer = () => useContext(QuizAnswerContext)
