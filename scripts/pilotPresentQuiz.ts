/**
 * Pilot of the `present_quiz` tool against real models (issue 07). Runs a few course-style scenarios per model
 * through the same pieces as `runAgent`: the tool module's `create` and `instructions`, `createAgent`,
 * `mapStreamChunk`, and for follow-ups the real history path (`summarizeForHistory` for the quiz part,
 * `quizAnswerToText` for the student's answer). No database: the system message is written here instead of
 * coming from a `Prompt`. The registry is not imported (it pulls in the RAG embedder, which does not load
 * under tsx), so `withToolInstructions` and `historyMessageToText` are mirrored below.
 *
 * Usage (from the repo root, needs AZURE_API_KEY and AZURE_RESOURCE in .env; Toska needs LOCAL_INFERENCE_API_URL
 * and LOCAL_INFERENCE_TOKEN):
 *
 *   npx tsx --env-file=.env scripts/pilotPresentQuiz.ts [model,model,...|all] [scenario,scenario,...] [repeats]
 *
 * Writes every run (events, quiz, checks) as JSON to `PILOT_OUT` (default `pilot-quiz-results.json`) and prints
 * a short summary per run.
 */
import { writeFile } from 'node:fs/promises'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { createAgent, createMiddleware, ToolMessage } from 'langchain'
import { ModelProvider, type ModelConfig, validModels } from '../src/config'
import type { AssistantPart, ChatEvent, ToolPart } from '../src/shared/agentChat'
import type { ChatMessage } from '../src/shared/chat'
import { PRESENT_QUIZ, parseQuiz, QUIZ_IDK, type QuizAnswer, quizProblems } from '../src/shared/quiz'
import type { User } from '../src/shared/user'
import { createStreamState, mapStreamChunk, nextStreamState, type StreamChunk } from '../src/server/services/agent/mapStreamChunk'
import { findQuizPart, presentQuiz, quizAnswerToText } from '../src/server/services/agent/tools/presentQuiz'
import { getAzureChatOpenAI, getToskaProvider } from '../src/server/services/langchain/modelGenerators'

const DEFAULT_MODELS = ['gpt-5.5', 'gpt-5-mini', 'gpt-6-luna', 'gpt-6.1-sol', 'Mistral-Large-3-1', 'gemma-4-26B-A4B']

type Scenario = {
  name: string
  system: string
  user: string
  /** Follow-up answers to the quiz of this scenario, sent with the real quiz answer path. */
  followUps?: Array<{ name: string; answer: (quiz: QuizInfo) => Omit<QuizAnswer, 'callId'> }>
}

type QuizInfo = { correct: string[]; wrong: string }

const DS_COURSE = [
  'You are the teaching assistant of the University of Helsinki course "Data Structures and Algorithms" (TKT20001).',
  'Help students learn; do not just hand out answers to graded exercises. Answer in the language the student writes in.',
].join(' ')

const scenarios: Scenario[] = [
  {
    name: 'quiz-me-en',
    system: DS_COURSE,
    user: 'Quiz me on Big-O notation, I have the exam next week.',
    followUps: [
      { name: 'correct', answer: ({ correct }) => ({ selected: correct, explanation: 'Because the loop halves the input each round.' }) },
      {
        name: 'wrong',
        answer: ({ wrong }) => ({ selected: [wrong], explanation: 'I thought nested loops always mean the bigger complexity wins.' }),
      },
      { name: 'idk', answer: () => ({ selected: [QUIZ_IDK], explanation: "I don't get what the n means and how you count the steps." }) },
    ],
  },
  {
    name: 'quiz-me-fi',
    system: [
      'Olet Helsingin yliopiston kurssin "Differentiaalilaskenta" (MAT11003) opetusavustaja.',
      'Auta opiskelijoita oppimaan. Vastaa opiskelijan kielellä.',
    ].join(' '),
    user: 'Voitko kysyä minulta yhden kysymyksen ketjusäännöstä?',
  },
  {
    name: 'teacher-asks-check',
    system: [
      'You are the assistant of the course "Introduction to Statistics" at the University of Helsinki.',
      "When you have explained a concept, check the student's understanding with a quiz.",
    ].join(' '),
    user: 'What is a p-value?',
  },
]

const user: User = { id: 'pilot', username: 'pilot', isAdmin: true, iamGroups: [], language: 'en' } as unknown as User

const getModel = (config: ModelConfig): BaseChatModel => {
  if (config.provider === ModelProvider.Azure) return getAzureChatOpenAI(config.name, true, config.reasoning)
  if (config.provider === ModelProvider.Toska) return getToskaProvider(config.name, true, config.reasoning)
  throw new Error(`The pilot does not support ${config.provider}`)
}

/** Same as `toolErrorMiddleware` in runAgent (not exported there), so an invalid quiz becomes an error tool part. */
const toolErrors = createMiddleware({
  name: 'ToolErrors',
  wrapToolCall: async (request, handler) => {
    try {
      return await handler(request)
    } catch (error) {
      toolErrorMessages.push(error instanceof Error ? error.message : String(error))
      return new ToolMessage({
        content: 'The tool failed. Tell the user it did not work, and answer without it if you can.',
        tool_call_id: request.toolCall.id ?? '',
        name: request.toolCall.name,
        status: 'error',
      })
    }
  },
})
let toolErrorMessages: string[] = []

type Turn = {
  parts: AssistantPart[]
  events: ChatEvent[]
  error?: string
  ms: number
  firstTokenMs?: number
}

/** Builds assistant parts from events the same way the client does (text and reasoning merged, tool parts updated). */
const eventsToParts = (events: ChatEvent[]): AssistantPart[] => {
  const parts: AssistantPart[] = []
  for (const event of events) {
    if ('path' in event && event.path.length > 0) continue
    const last = parts.at(-1)
    if (event.type === 'text.delta') {
      if (last?.type === 'text') last.text += event.text
      else parts.push({ type: 'text', text: event.text })
    } else if (event.type === 'reasoning.delta') {
      if (last?.type === 'reasoning') last.text += event.text
      else parts.push({ type: 'reasoning', text: event.text })
    } else if (event.type === 'tool.start') {
      parts.push({ type: 'tool', callId: event.callId, name: event.name, input: event.input, status: 'running' })
    } else if (event.type === 'tool.end') {
      const part = parts.find((p): p is ToolPart => p.type === 'tool' && p.callId === event.callId)
      if (part) Object.assign(part, { status: event.status, result: event.result })
    }
  }
  return parts
}

/** Mirrors `withToolInstructions` in the tool registry. */
const withQuizInstructions = (systemMessage: string) => `${systemMessage}\n\n## Tool: ${PRESENT_QUIZ}\n\n${presentQuiz.instructions}`

/** Mirrors `historyMessageToText` in the tool registry for a turn with text, reasoning and quiz parts. */
const historyMessageToText = (parts: AssistantPart[]) =>
  parts
    .map((part) => (part.type === 'text' ? part.text : part.type === 'tool' && presentQuiz.kind === 'tool' ? presentQuiz.summarizeForHistory(part) : ''))
    .filter((text) => text.length > 0)
    .join('\n\n')

const runTurn = async (config: ModelConfig, system: string, history: ChatMessage[]): Promise<Turn> => {
  const quizTool = presentQuiz.create({ user, course: null, model: config.name as never, config: undefined, signal: new AbortController().signal })
  quizTool.returnDirect = true
  const tools = [quizTool]
  const agent = createAgent({ model: getModel(config), tools, middleware: [toolErrors] })
  const messages = [
    ...(config.instructions ? [{ role: 'system' as const, content: config.instructions }] : []),
    { role: 'system' as const, content: withQuizInstructions(system) },
    ...history,
  ]

  const startedAt = Date.now()
  const events: ChatEvent[] = []
  let firstTokenMs: number | undefined
  try {
    const stream = await agent.stream({ messages }, { streamMode: ['messages', 'updates', 'custom'], subgraphs: true, recursionLimit: 25 })
    let state = createStreamState([])
    for await (const chunk of stream) {
      state = nextStreamState(state, chunk as StreamChunk)
      for (const event of mapStreamChunk(chunk as StreamChunk, state)) {
        if (event.type === 'text.delta') firstTokenMs ??= Date.now() - startedAt
        events.push(event)
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { parts: eventsToParts(events), events, error: message, ms: Date.now() - startedAt, firstTokenMs }
  }
  return { parts: eventsToParts(events), events, ms: Date.now() - startedAt, firstTokenMs }
}

const IDK_PATTERN = /don.?t know|en tiedä|vet inte|not sure|ei aavistusta/i

/** Automatic checks of a quiz turn; the quality of the text is read by hand from the output. */
const checkQuizTurn = (turn: Turn) => {
  const quizIndex = turn.parts.findIndex((p) => p.type === 'tool' && p.name === PRESENT_QUIZ)
  const quizParts = turn.parts.filter((p): p is ToolPart => p.type === 'tool' && p.name === PRESENT_QUIZ)
  const textBefore = turn.parts
    .slice(0, quizIndex === -1 ? undefined : quizIndex)
    .flatMap((p) => (p.type === 'text' ? [p.text] : []))
    .join('')
  const textAfter =
    quizIndex === -1
      ? ''
      : turn.parts
          .slice(quizIndex + 1)
          .flatMap((p) => (p.type === 'text' ? [p.text] : []))
          .join('')
  const quiz = quizParts[0] ? parseQuiz(quizParts[0].input) : null
  const correctTexts = quiz ? quiz.options.filter((o) => quiz.correct.includes(o.id)).map((o) => o.text.trim()) : []
  const leak = (text: string) => correctTexts.some((t) => t.length > 3 && text.toLowerCase().includes(t.toLowerCase()))
  return {
    quizCalls: quizParts.length,
    statuses: quizParts.map((p) => p.status),
    schemaValid: quizParts[0] ? quiz !== null : null,
    problems: quiz ? quizProblems(quiz) : null,
    leadInChars: textBefore.trim().length,
    textAfterChars: textAfter.trim().length,
    answerInLeadIn: leak(textBefore),
    answerInQuestion: quiz ? leak(quiz.question) : null,
    idkOption: quiz ? quiz.options.some((o) => IDK_PATTERN.test(o.text)) : null,
    optionCount: quiz?.options.length ?? null,
    multiSelect: quiz?.multiSelect ?? null,
    hasConcept: quiz ? quiz.concept !== undefined : null,
  }
}

const checkFollowUpTurn = (turn: Turn) => ({
  quizCalls: turn.parts.filter((p) => p.type === 'tool' && p.name === PRESENT_QUIZ).length,
  textChars: turn.parts
    .flatMap((p) => (p.type === 'text' ? [p.text] : []))
    .join('')
    .trim().length,
})

const printTurn = (label: string, turn: Turn, checks: object) => {
  console.log(`\n===== ${label} (${(turn.ms / 1000).toFixed(1)} s)${turn.error ? ` ERROR: ${turn.error}` : ''}`)
  if (toolErrorMessages.length > 0) console.log(`tool errors: ${toolErrorMessages.join(' | ')}`)
  for (const part of turn.parts) {
    if (part.type === 'text') console.log(`[text] ${part.text}`)
    else if (part.type === 'reasoning') console.log(`[reasoning] ${part.text.slice(0, 300)}${part.text.length > 300 ? '…' : ''}`)
    else if (part.type === 'tool') console.log(`[tool ${part.name} ${part.status}] ${JSON.stringify(part.input)}`)
  }
  if (turn.events.some((e) => e.type === 'error')) console.log(`[error event] ${JSON.stringify(turn.events.filter((e) => e.type === 'error'))}`)
  console.log(`checks: ${JSON.stringify(checks)}`)
}

const main = async () => {
  const modelArg = process.argv[2] ?? 'all'
  const scenarioArg = process.argv[3] ?? 'all'
  const repeats = Number(process.argv[4] ?? 1)
  const modelNames = modelArg === 'all' ? DEFAULT_MODELS : modelArg.split(',')
  const chosen = scenarioArg === 'all' ? scenarios : scenarios.filter((s) => scenarioArg.split(',').includes(s.name))
  const results: unknown[] = []

  for (const name of modelNames) {
    const config = validModels.find((m) => m.name === name)
    if (!config) throw new Error(`Unknown model ${name}`)
    for (let round = 0; round < repeats; round++) {
      for (const scenario of chosen) {
        toolErrorMessages = []
        const history: ChatMessage[] = [{ role: 'user', content: scenario.user }]
        const turn = await runTurn(config, scenario.system, history)
        const checks = checkQuizTurn(turn)
        const label = `${name} / ${scenario.name}${repeats > 1 ? ` #${round + 1}` : ''}`
        printTurn(label, turn, checks)
        results.push({ model: name, scenario: scenario.name, round, kind: 'quiz', checks, toolErrors: toolErrorMessages, turn })

        const quizPart = turn.parts.find((p): p is ToolPart => p.type === 'tool' && p.name === PRESENT_QUIZ && p.status === 'ok')
        const quiz = quizPart ? parseQuiz(quizPart.input) : null
        if (!quizPart || !quiz || !scenario.followUps) continue

        const wrong = quiz.options.find((o) => !quiz.correct.includes(o.id))?.id ?? quiz.options[0].id
        for (const followUp of scenario.followUps) {
          toolErrorMessages = []
          const answer: QuizAnswer = { callId: quizPart.callId, ...followUp.answer({ correct: quiz.correct, wrong }) }
          const answerText = quizAnswerToText(answer, findQuizPart([turn.parts], answer.callId))
          const followHistory: ChatMessage[] = [
            ...history,
            { role: 'assistant', content: historyMessageToText(turn.parts) },
            { role: 'user', content: answerText },
          ]
          const followTurn = await runTurn(config, scenario.system, followHistory)
          const followChecks = checkFollowUpTurn(followTurn)
          printTurn(`${label} -> ${followUp.name}`, followTurn, followChecks)
          results.push({ model: name, scenario: scenario.name, round, kind: followUp.name, answerText, checks: followChecks, turn: followTurn })
        }
      }
    }
  }

  const out = process.env.PILOT_OUT ?? 'pilot-quiz-results.json'
  await writeFile(out, `${JSON.stringify(results, null, 2)}\n`)
  console.log(`\nWrote ${results.length} runs to ${out}`)
}

void main()
