// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { startTestServer } from '../../tests/testServer'
import { setMembership } from '../../tests/membership'

vi.mock('../../db/models', () => ({
  ChatInstance: { findOne: vi.fn(), findByPk: vi.fn() },
  Discussion: { create: vi.fn() },
  Enrolment: { findOne: vi.fn() },
  Prompt: { findByPk: vi.fn() },
  PromptUsage: { create: vi.fn() },
  RagIndex: {},
  Responsibility: { findOne: vi.fn() },
  User: {},
  UserChatInstanceUsage: { findOrCreate: vi.fn() },
}))

vi.mock('../../services/chatInstances/usage', async (importOriginal) => ({
  checkCourseUsage: vi.fn(() => true),
  checkUsage: (await importOriginal<typeof import('../../services/chatInstances/usage')>()).checkUsage,
  calculateUsage: (await importOriginal<typeof import('../../services/chatInstances/usage')>()).calculateUsage,
  getCourseTokenLimit: vi.fn(() => 50_000),
  getUsage: vi.fn(async () => 0),
  getUserTokenLimit: vi.fn(async () => 100_000),
  incrementCourseUsage: vi.fn(),
  incrementUsage: vi.fn(),
}))

// The real search needs the vector DB; the mock search (used with the mock model) is kept real.
vi.mock('../../services/rag/search', () => ({ search: vi.fn() }))
vi.mock('../../services/langchain/fileSearchResultsStore', () => ({ ToolResultStore: { saveResults: vi.fn() } }))

vi.mock('../../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({ captureException: vi.fn() }))

import { validModels } from '@config'
import v4Router from './v4'
import { ChatInstance, Discussion, Prompt, PromptUsage, UserChatInstanceUsage } from '../../db/models'
import { getUsage, getUserTokenLimit, incrementCourseUsage, incrementUsage } from '../../services/chatInstances/usage'
import type { ChatEvent } from '../../../shared/agentChat'
import { MockModel } from '../../services/langchain/MockModel'
import { ToolResultStore } from '../../services/langchain/fileSearchResultsStore'

let currentUser = { id: 'user-1', isAdmin: false }

const api = startTestServer('/ai/v4', v4Router, () => currentUser)

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'user-1', isAdmin: false }
  vi.mocked(getUsage).mockResolvedValue(0)
  vi.mocked(getUserTokenLimit).mockResolvedValue(100_000)
})

/** The /stream route reads its JSON payload out of a multipart `data` field, like v3. The real MockModel answers. */
const stream = ({
  message = 'say hello world',
  promptId,
  courseId,
  history = [],
}: { message?: string; promptId?: string; courseId?: string; history?: unknown[] } = {}) => {
  const form = new FormData()
  form.append(
    'data',
    JSON.stringify({
      options: {
        chatMessages: [...history, { role: 'user', content: message }],
        generationInfo: {
          model: 'mock',
          promptInfo: promptId ? { type: 'saved', id: promptId, name: 'Essay helper' } : { type: 'custom', systemMessage: 'You are helpful' },
        },
      },
      ...(courseId ? { courseId } : {}),
    }),
  )

  return api.fetch(`/ai/v4/stream`, { method: 'POST', body: form })
}

const readEvents = async (response: Response): Promise<ChatEvent[]> =>
  (await response.text())
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ChatEvent)

const textOf = (events: ChatEvent[]) =>
  events
    .filter((e) => e.type === 'text.delta')
    .map((e) => e.text)
    .join('')

const savedPrompt = (type: string, overrides = {}) =>
  ({
    id: 'prompt-1',
    userId: 'user-1',
    name: 'Essay helper',
    type,
    systemMessage: 'You help with essays',
    messages: [],
    language: null,
    ragIndex: null,
    ...overrides,
  }) as any

describe('POST /ai/v4/stream', () => {
  test('streams the answer as NDJSON text deltas followed by usage', async () => {
    const response = await stream({ message: 'say hello world' })
    const events = await readEvents(response)

    expect(response.status).toBe(200)
    expect(textOf(events)).toBe('hello world')
    expect(events.every((e) => e.type !== 'text.delta' || e.path.length === 0)).toBe(true)
    expect(events.at(-1)).toEqual({ type: 'usage', inputTokens: 0, outputTokens: 0 })
    expect(incrementUsage).toHaveBeenCalledWith(currentUser, 0)
  })

  test('answers from the mock document search when the prompt has a RAG index', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(savedPrompt('PERSONAL', { ragIndex: { id: 7, metadata: { name: 'Materials', language: 'en' } } }))

    const events = await readEvents(await stream({ message: 'rag please', promptId: 'prompt-1' }))

    expect(textOf(events)).toContain('Ok! Got some great results from that mock tool call!')
    expect(textOf(events)).toContain('This is the first mock document.')

    const files = ['mock_document1.pdf', 'mock_document2.pdf', 'mock_document3.pdf'].map((fileName) =>
      expect.objectContaining({ fileName, excerpt: expect.any(String) }),
    )
    expect(events.filter((e) => e.type.startsWith('tool.'))).toEqual([
      { type: 'tool.start', path: [], callId: 'mock_document_search_id', name: 'document_search', input: { query: 'mock test query' } },
      { type: 'tool.end', path: [], callId: 'mock_document_search_id', status: 'ok', result: { files } },
    ])
    expect(events.findIndex((e) => e.type === 'tool.end')).toBeLessThan(events.findIndex((e) => e.type === 'text.delta'))
    expect(ToolResultStore.saveResults).toHaveBeenCalledWith(
      'mock_document_search_id',
      expect.arrayContaining([expect.objectContaining({ content: 'This is the first mock document.' })]),
      currentUser,
    )
  })

  test('multitool: two tool calls in one turn both start and end before the answer', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(savedPrompt('PERSONAL', { ragIndex: { id: 7, metadata: { name: 'Materials', language: 'en' } } }))

    const events = await readEvents(await stream({ message: 'multitool', promptId: 'prompt-1' }))
    const toolEvents = events.filter((e) => e.type.startsWith('tool.')) as Extract<ChatEvent, { callId: string }>[]

    expect(toolEvents.filter((e) => e.type === 'tool.start').map((e) => e.callId)).toEqual(['mock_multitool_1', 'mock_multitool_2'])
    expect(
      toolEvents
        .filter((e) => e.type === 'tool.end')
        .map((e) => e.callId)
        .sort(),
    ).toEqual(['mock_multitool_1', 'mock_multitool_2'])
    expect(textOf(events)).toContain('Ok! Got some great results from that mock tool call!')
  })

  test('a failing tool ends as an error and the model still answers', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(savedPrompt('PERSONAL', { ragIndex: { id: 7, metadata: { name: 'Materials', language: 'en' } } }))
    vi.mocked(ToolResultStore.saveResults).mockRejectedValueOnce(new Error('redis down'))

    const events = await readEvents(await stream({ message: 'rag please', promptId: 'prompt-1' }))

    expect(events).toContainEqual(expect.objectContaining({ type: 'tool.end', callId: 'mock_document_search_id', status: 'error' }))
    expect(events.some((e) => e.type === 'error')).toBe(false)
    expect(textOf(events)).toContain('Ok! Got some great results from that mock tool call!')
  })

  test('appends the instructions of enabled tools to the system message', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(savedPrompt('PERSONAL', { ragIndex: { id: 7, metadata: { name: 'Materials', language: 'en' } } }))
    const spy = vi.spyOn(MockModel.prototype, '_streamResponseChunks')

    await (await stream({ message: 'say hi', promptId: 'prompt-1' })).text()

    const systemMessages = (spy.mock.calls[0][0] as { type: string; content: unknown }[]).filter((m) => m.type === 'system')
    spy.mockRestore()
    expect(String(systemMessages.at(-1)?.content)).toMatch(/^You help with essays\n\n## Tool: document_search\n\nUse document_search/)
  })

  test('sends earlier tool parts to the model as text summaries, not tool calls', async () => {
    const spy = vi.spyOn(MockModel.prototype, '_streamResponseChunks')
    const history = [
      { role: 'user', content: 'when is the exam?' },
      {
        role: 'assistant',
        parts: [
          {
            type: 'tool',
            callId: 'old',
            name: 'document_search',
            input: { query: 'exam' },
            status: 'ok',
            result: { files: [{ fileName: 'a.pdf', excerpt: 'On Monday.' }] },
          },
          { type: 'text', text: 'On Monday.' },
        ],
      },
    ]

    const response = await stream({ message: 'say thanks', history })
    await response.text()

    const messages = spy.mock.calls[0][0] as { type: string; content: unknown; tool_calls?: unknown[] }[]
    spy.mockRestore()
    expect(response.status).toBe(200)
    const assistant = messages.find((m) => m.type === 'ai')
    expect(assistant?.content).toBe('[Searched the course materials for "exam". Results (excerpts):\n- a.pdf: "On Monday."\n]\n\nOn Monday.')
    expect(assistant?.tool_calls ?? []).toEqual([])
    expect(messages.some((m) => m.type === 'tool')).toBe(false)
  })

  test('streams the reasoning of a `think` answer before its text', async () => {
    const events = await readEvents(await stream({ message: 'think the answer' }))
    const deltas = events.filter((e) => e.type === 'reasoning.delta' || e.type === 'text.delta')

    expect(deltas.map((e) => e.type)).toEqual(['reasoning.delta', 'reasoning.delta', 'reasoning.delta', 'text.delta'])
    expect(
      deltas
        .filter((e) => e.type === 'reasoning.delta')
        .map((e) => e.text)
        .join(''),
    ).toBe('**Reading the question**\n\nThe user wants a mock answer after some mock thinking.')
    expect(deltas.every((e) => e.path.length === 0)).toBe(true)
    expect(textOf(events)).toBe('the answer')
  })

  test('does not stream reasoning for a model without a reasoning config', async () => {
    const mock = validModels.find((m) => m.name === 'mock')!
    const reasoning = mock.reasoning
    delete mock.reasoning
    try {
      const events = await readEvents(await stream({ message: 'think the answer' }))
      expect(events.some((e) => e.type === 'reasoning.delta')).toBe(false)
      expect(textOf(events)).toBe('the answer')
    } finally {
      mock.reasoning = reasoning
    }
  })

  test('never sends earlier reasoning back to the model', async () => {
    const spy = vi.spyOn(MockModel.prototype, '_streamResponseChunks')
    const history = [
      { role: 'user', content: 'think hard' },
      {
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'SECRET REASONING', durationMs: 2000 },
          { type: 'text', text: 'hard' },
        ],
      },
    ]

    const response = await stream({ message: 'say thanks', history })
    await response.text()

    const messages = spy.mock.calls[0][0] as { type: string; content: unknown }[]
    spy.mockRestore()
    expect(response.status).toBe(200)
    expect(messages.find((m) => m.type === 'ai')?.content).toBe('hard')
    expect(JSON.stringify(messages)).not.toContain('SECRET REASONING')
  })

  test('emits an error event when the model fails', async () => {
    const response = await stream({ message: 'fail' })
    const events = await readEvents(response)

    expect(response.status).toBe(200)
    expect(events).toContainEqual({ type: 'error', error: 'Error while generating response' })
    expect(events.some((e) => e.type === 'usage')).toBe(false)
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  test('shows the content-filter explanation as the answer, like v3', async () => {
    const filtered = Object.assign(new Error('filtered'), { code: 'content_filter', error: { message: 'Blocked by the content filter.' } })
    const spy = vi.spyOn(MockModel.prototype, '_streamResponseChunks').mockImplementation(async function* () {
      yield* []
      throw filtered
    })

    const events = await readEvents(await stream({ message: 'say something bad' }))
    spy.mockRestore()

    expect(events).toContainEqual({ type: 'text.delta', path: [], text: 'Blocked by the content filter.' })
    expect(events.some((e) => e.type === 'error')).toBe(false)
  })

  test('returns warnings instead of a stream when the message uses much of the budget', async () => {
    vi.mocked(getUserTokenLimit).mockResolvedValue(50)

    const response = await stream({ message: 'say hello world' })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ warnings: [expect.objectContaining({ warningType: 'usage' })] })
  })

  test('refuses when the weekly usage limit is reached', async () => {
    vi.mocked(getUsage).mockResolvedValue(100_000)

    const response = await stream()

    expect(response.status).toBe(403)
  })

  test('refuses to chat with a TEMPLATE prompt', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(savedPrompt('TEMPLATE'))

    const response = await stream({ promptId: 'prompt-1' })

    expect(response.status).toBe(403)
  })

  test("refuses someone else's PERSONAL prompt", async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(savedPrompt('PERSONAL', { userId: 'someone-else' }))

    const response = await stream({ promptId: 'prompt-1' })

    expect(response.status).toBe(404)
  })
})

const course = (overrides = {}) =>
  ({
    id: 'ci-1',
    name: { fi: 'Kurssi' },
    activated: true,
    activityPeriod: { startDate: '2020-01-01', endDate: '2099-01-01' },
    usageLimit: 10,
    saveDiscussions: false,
    ...overrides,
  }) as any

const givenCourse = (overrides = {}, membership: Parameters<typeof setMembership>[0] = { enrolled: true }) => {
  setMembership(membership)
  vi.mocked(ChatInstance.findOne).mockResolvedValue(course(overrides))
  vi.mocked(UserChatInstanceUsage.findOrCreate).mockResolvedValue([{}, false] as any)
  vi.mocked(Prompt.findByPk).mockResolvedValue(savedPrompt('CHAT_INSTANCE'))
}

describe('POST /ai/v4/stream in a course', () => {
  test('charges the course budget and records prompt usage', async () => {
    givenCourse()

    const response = await stream({ promptId: 'prompt-1', courseId: 'course-1' })
    await response.text()

    expect(response.status).toBe(200)
    expect(incrementCourseUsage).toHaveBeenCalledWith(expect.objectContaining({ id: 'ci-1' }), 0)
    expect(PromptUsage.create).toHaveBeenCalledWith(expect.objectContaining({ chatInstanceId: 'ci-1', promptId: 'prompt-1', userId: 'user-1' }))
    expect(incrementUsage).not.toHaveBeenCalled()
  })

  test('saves the discussion when the course saves discussions', async () => {
    givenCourse({ saveDiscussions: true })

    await (await stream({ message: 'say saved answer', promptId: 'prompt-1', courseId: 'course-1' })).text()

    expect(Discussion.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', courseId: 'course-1', response: 'saved answer' }))
  })

  test('saves earlier answers in the discussion as text, as the model got them', async () => {
    givenCourse({ saveDiscussions: true })
    const history = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', parts: [{ type: 'text', text: 'Hello!' }] },
    ]

    await (await stream({ message: 'say bye', promptId: 'prompt-1', courseId: 'course-1', history })).text()

    const { metadata } = vi.mocked(Discussion.create).mock.calls[0][0] as unknown as { metadata: { chatMessages: unknown[] } }
    expect(metadata.chatMessages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'say bye' },
    ])
  })

  test('refuses an outsider', async () => {
    currentUser = { id: 'outsider-1', isAdmin: false }
    givenCourse({}, {})

    const response = await stream({ promptId: 'prompt-1', courseId: 'course-1' })

    expect(response.status).toBe(403)
  })

  test('refuses a student when the course has ended', async () => {
    givenCourse({ activityPeriod: { startDate: '2020-01-01', endDate: '2020-06-01' } })

    const response = await stream({ promptId: 'prompt-1', courseId: 'course-1' })

    expect(response.status).toBe(403)
  })
})
