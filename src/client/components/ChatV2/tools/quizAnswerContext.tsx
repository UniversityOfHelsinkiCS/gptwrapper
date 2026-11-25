import { createContext, type ReactNode, useContext, useMemo } from 'react'
import type { TFunction } from 'i18next'
import type { AssistantPart } from '../../../../shared/agentChat'
import { parseQuiz, PRESENT_QUIZ, type Quiz, QUIZ_IDK, type QuizAnswer, quizOutcome, type QuizOutcome, type QuizResult } from '../../../../shared/quiz'

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

export const isQuizResult = (value: unknown): value is QuizResult =>
  typeof value === 'object' && value !== null && Array.isArray((value as QuizResult).correct) && typeof (value as QuizResult).explanation === 'string'

/** The translation key of the headline of each outcome, shown on the card and announced when the answer is sent. */
export const QUIZ_OUTCOME_KEY = { correct: 'chat:quizCorrect', incorrect: 'chat:quizIncorrect', idk: 'chat:quizIdkResult' } as const satisfies Record<
  QuizOutcome,
  string
>

/** A quiz as markdown for exported conversations: the question, the options with the correct and picked ones marked, the outcome and the explanation. */
export const quizToMarkdown = (quiz: Quiz, result: QuizResult | undefined, answer: QuizAnswer | undefined, t: TFunction): string => {
  const options = answer?.selected.includes(QUIZ_IDK) ? [...quiz.options, { id: QUIZ_IDK, text: t('chat:quizIdk') }] : quiz.options
  const optionLines = options.map((option) => {
    const markers = [
      answer && result?.correct.includes(option.id) ? t('chat:quizCorrectOption') : null,
      answer?.selected.includes(option.id) ? t('chat:quizYourAnswer') : null,
    ].filter(Boolean)
    const prefix = option.id === QUIZ_IDK ? '' : `${option.id}) `
    return `- ${prefix}${option.text}${markers.map((marker) => ` (${marker})`).join('')}`
  })

  const blocks = [`**${t('chat:quizTitle')}**`, quiz.question, optionLines.join('\n')]
  if (!answer) {
    blocks.push(`*${t('chat:quizNotAnswered')}*`)
  } else if (result) {
    blocks.push(`**${t(QUIZ_OUTCOME_KEY[quizOutcome(result.correct, answer.selected)])}**`)
    blocks.push(`**${t('chat:quizExplanation')}:** ${result.explanation}`)
  }
  return blocks.join('\n\n')
}

export const quizResultAnnouncement = (parts: AssistantPart[], answer: QuizAnswer, t: TFunction): string => {
  const part = parts.find((p) => p.type === 'tool' && p.name === PRESENT_QUIZ && p.callId === answer.callId)
  if (part?.type !== 'tool' || !isQuizResult(part.result)) return ''
  return `${t(QUIZ_OUTCOME_KEY[quizOutcome(part.result.correct, answer.selected)])} ${t('chat:quizResultSeeCard')}`
}
