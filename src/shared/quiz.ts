import z from 'zod/v4'

/** Name of the quiz tool, on the server (`services/agent/tools/presentQuiz.ts`) and in the client's tool registry. */
export const PRESENT_QUIZ = 'present_quiz'

/** The "I don't know" option the client adds to every quiz. It excludes the other options, also in multi-select. */
export const QUIZ_IDK = 'idk'

export const QuizOptionSchema = z.object({
  id: z.string().describe('a short id for the option, unique within the quiz, for example "a"'),
  text: z.string().describe('the option text, markdown and math allowed'),
})

/** The input of a `present_quiz` call: one multiple-choice question, with the answer for the client to show after answering. */
export const QuizSchema = z.object({
  question: z.string().describe('the question, markdown and math allowed; must not reveal the answer'),
  options: z.array(QuizOptionSchema).describe('2 or more answer options. Do not add an "I don\'t know" option, it is added automatically'),
  multiSelect: z.boolean().describe('true if the student may pick several options'),
  correct: z.array(z.string()).describe('ids of the correct options; exactly one when multiSelect is false'),
  explanation: z.string().describe('why the correct answer is correct, shown to the student after answering'),
  concept: z.string().optional().describe('the concept the question tests, in a few words'),
})

export type QuizOption = z.infer<typeof QuizOptionSchema>
export type Quiz = z.infer<typeof QuizSchema>

/** The `result` of a finished `present_quiz` part (the tool's artifact): what the client shows once the student has answered. */
export type QuizResult = Pick<Quiz, 'correct' | 'explanation'>

/** The student's answer to a quiz, sent as a user message right after it. `selected` is `['idk']` for "I don't know". */
export const QuizAnswerSchema = z.object({
  callId: z.string(),
  selected: z.array(z.string()).min(1),
  explanation: z.string().max(10_000).optional(),
})

export type QuizAnswer = z.infer<typeof QuizAnswerSchema>

/** `idk` is a "doesn't know" signal, not a wrong answer. */
export type QuizOutcome = 'correct' | 'incorrect' | 'idk'

export const quizOutcome = (correct: string[], selected: string[]): QuizOutcome => {
  if (selected.includes(QUIZ_IDK)) return 'idk'
  const expected = new Set(correct)
  return selected.length === expected.size && selected.every((id) => expected.has(id)) ? 'correct' : 'incorrect'
}

/** The quiz in a tool part's input, or null when it is not a valid quiz. */
export const parseQuiz = (input: unknown): Quiz | null => {
  const parsed = QuizSchema.safeParse(input)
  return parsed.success ? parsed.data : null
}

/** What is wrong with a quiz the model generated, as messages for the model. Empty when it is fine. */
export const quizProblems = (quiz: Quiz): string[] => {
  const ids = quiz.options.map((option) => option.id)
  const problems: string[] = []
  if (quiz.options.length < 2) problems.push('Give at least 2 options.')
  if (new Set(ids).size !== ids.length) problems.push('Option ids must be unique.')
  if (ids.includes(QUIZ_IDK)) problems.push(`The option id "${QUIZ_IDK}" is reserved for the automatic "I don't know" option.`)
  if (quiz.correct.length === 0) problems.push('Mark at least one option as correct.')
  if (quiz.correct.some((id) => !ids.includes(id))) problems.push('Every id in correct must be an option id.')
  if (!quiz.multiSelect && quiz.correct.length > 1) problems.push('A single-select quiz has exactly one correct option.')
  return problems
}
