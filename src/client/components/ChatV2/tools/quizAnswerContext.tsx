import { createContext, type ReactNode, useContext, useMemo } from 'react'
import type { TFunction } from 'i18next'
import type { AssistantPart } from '../../../../shared/agentChat'
import { parseQuiz, PRESENT_QUIZ, type Quiz, QUIZ_IDK, type QuizAnswer } from '../../../../shared/quiz'

/** The options picked in the open quiz, before it is answered. Shared by the quiz card and the chat box, which sends the answer with its text. */
export type QuizSelection = { callId: string; selected: string[] }

export type QuizAnswerContextValue = {
  /** The answer in the user message right after this assistant message, if it is a quiz answer. */
  answer?: QuizAnswer
  /** The options picked in the open quiz of this message. */
  selection?: QuizSelection | null
  /** Picks options in a quiz. Only set while a quiz in this message can be answered (latest message, not streaming). */
  onSelect?: (selection: QuizSelection) => void
  /** Sends the picked options with the text in the chat box as the answer. Set together with `onSelect`. */
  onSubmit?: () => void
  /** The conversation went on after this message, so its unanswered quizzes can no longer be answered. */
  closed?: boolean
}

const QuizAnswerContext = createContext<QuizAnswerContextValue>({})

/** What the quiz cards of one assistant message need to know about the conversation around them. */
export const QuizAnswerProvider = ({ answer, selection, onSelect, onSubmit, closed, children }: QuizAnswerContextValue & { children: ReactNode }) => {
  const value = useMemo(() => ({ answer, selection, onSelect, onSubmit, closed }), [answer, selection, onSelect, onSubmit, closed])
  return <QuizAnswerContext.Provider value={value}>{children}</QuizAnswerContext.Provider>
}

export const useQuizAnswer = () => useContext(QuizAnswerContext)

/** The quiz of a `present_quiz` part with this call id in the parts, if there is one. */
export const findQuiz = (parts: AssistantPart[], callId: string): Quiz | null => {
  const part = parts.find((p) => p.type === 'tool' && p.name === PRESENT_QUIZ && p.callId === callId)
  return part?.type === 'tool' && part.status === 'ok' ? parseQuiz(part.input) : null
}

/** The user message of a quiz answer: the picked options and the student's explanation. */
export const quizAnswerMessage = (quiz: Quiz, answer: QuizAnswer, t: TFunction): string => {
  const label = (id: string) => (id === QUIZ_IDK ? t('chat:quizIdk') : quiz.options.find((option) => option.id === id)?.text ?? id)
  const picked = t('chat:quizAnswerMessage', { answer: answer.selected.map(label).join(', '), interpolation: { escapeValue: false } })
  return [picked, answer.explanation].filter(Boolean).join('\n\n')
}
