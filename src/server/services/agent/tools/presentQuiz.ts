import { tool } from '@langchain/core/tools'
import type { AssistantPart, ToolPart } from '@shared/agentChat'
import { PRESENT_QUIZ, parseQuiz, type Quiz, QUIZ_IDK, type QuizAnswer, quizOutcome, quizProblems, type QuizResult, QuizSchema } from '@shared/quiz'
import type { PlainToolModule } from './types'

/** What the model reads as the tool result. With `returnDirect` the turn ends there, so it only matters if that changes. */
const QUIZ_SHOWN = 'The quiz is shown to the student. Their answer comes in their next message.'

/** Every quiz answer text for the model starts with this (the mock model recognises answers by it). */
export const QUIZ_ANSWER_PREFIX = '[Quiz answer]'

const OUTCOME_TEXT = { correct: 'correct', incorrect: 'incorrect', idk: 'did not know' } as const

const optionLabel = (quiz: Quiz, id: string) => {
  const option = quiz.options.find((o) => o.id === id)
  return option ? `${id}) ${option.text}` : id
}

/**
 * Asks the student one multiple-choice question as an interactive card. The turn ends at the quiz
 * (`returnDirect`); the client shows the result from the artifact on Submit and sends the answer as the
 * next user message (`UserMessage.quizAnswer`), which `quizAnswerToText` turns into text for the model.
 */
export const presentQuiz: PlainToolModule = {
  name: PRESENT_QUIZ,
  kind: 'tool',
  executor: 'server',
  stage: 'experimental',
  returnDirect: true,
  instructions: [
    'Use present_quiz to check what the student knows with one multiple-choice question.',
    '- Ask one question per call, and call it at most once per answer.',
    '- Do not reveal the answer in the question text or in your own text.',
    '- Write a short lead-in before the quiz, and nothing after it: your turn ends at the quiz.',
    '- Do not add an "I don\'t know" option; it is added automatically.',
    "- The student's answer comes in their next message. React to it, and explain more if they were wrong or did not know.",
  ].join('\n'),

  create: () =>
    tool(
      async (quiz: Quiz) => {
        const problems = quizProblems(quiz)
        if (problems.length > 0) throw new Error(`Invalid quiz: ${problems.join(' ')}`)
        return [QUIZ_SHOWN, { correct: quiz.correct, explanation: quiz.explanation } satisfies QuizResult]
      },
      {
        name: PRESENT_QUIZ,
        description: 'Shows the student one multiple-choice question as an interactive card. Ends your turn; the answer comes in the next message.',
        schema: QuizSchema,
        responseFormat: 'content_and_artifact',
        returnDirect: true,
      },
    ),

  summarizeForHistory: (part: ToolPart) => {
    const quiz = parseQuiz(part.input)
    if (!quiz || part.status === 'error') return '[Tried to show the student a quiz, but it failed.]'

    const options = quiz.options.map((option) => `- ${option.id}) ${option.text}${quiz.correct.includes(option.id) ? ' (correct)' : ''}`)
    return [
      `[Showed the student a quiz${quiz.concept ? ` on ${quiz.concept}` : ''}${quiz.multiSelect ? ' (several answers allowed)' : ''}: "${quiz.question}"`,
      'Options:',
      ...options,
      `Explanation shown after answering: "${quiz.explanation}"]`,
    ].join('\n')
  },
}

/** The quiz part of an earlier answer that a quiz answer belongs to: the closest one before it with that call id. */
export const findQuizPart = (assistantParts: AssistantPart[][], callId: string): ToolPart | undefined =>
  assistantParts.flat().findLast((part): part is ToolPart => part.type === 'tool' && part.name === PRESENT_QUIZ && part.callId === callId)

/** The student's answer to a quiz as text for the model: what they picked, whether it was right, and their explanation. */
export const quizAnswerToText = (answer: QuizAnswer, part: ToolPart | undefined): string => {
  const quiz = part ? parseQuiz(part.input) : null
  const isIdk = answer.selected.includes(QUIZ_IDK)
  const selected = isIdk ? '"I don\'t know"' : answer.selected.map((id) => (quiz ? optionLabel(quiz, id) : id)).join('; ')
  const lines = [QUIZ_ANSWER_PREFIX, `Selected: ${selected}`]
  if (quiz) {
    const outcome = quizOutcome(quiz.correct, answer.selected)
    lines.push(`Result: ${OUTCOME_TEXT[outcome]}`)
    if (outcome !== 'correct') lines.push(`Correct answer: ${quiz.correct.map((id) => optionLabel(quiz, id)).join('; ')}`)
  }
  const explanation = answer.explanation?.trim()
  if (explanation) lines.push(`${isIdk ? 'What is unclear to the student' : "Student's reasoning"}: "${explanation}"`)
  return lines.join('\n')
}
