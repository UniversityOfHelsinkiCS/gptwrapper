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

// The real search tool needs the vector DB; the mock search tool (used with the mock model) is kept real.
vi.mock('../../services/rag/searchTool', () => ({ getRagIndexSearchTool: vi.fn() }))

vi.mock('../../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({ captureException: vi.fn() }))

import v4Router from './v4'
import { ChatInstance, Discussion, Prompt, PromptUsage, UserChatInstanceUsage } from '../../db/models'
import { getUsage, getUserTokenLimit, incrementCourseUsage, incrementUsage } from '../../services/chatInstances/usage'
import type { ChatEvent } from '../../../shared/agentChat'
import { MockModel } from '../../services/langchain/MockModel'

let currentUser = { id: 'user-1', isAdmin: false }

const api = startTestServer('/ai/v4', v4Router, () => currentUser)

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'user-1', isAdmin: false }
  vi.mocked(getUsage).mockResolvedValue(0)
  vi.mocked(getUserTokenLimit).mockResolvedValue(100_000)
})

/** The /stream route reads its JSON payload out of a multipart `data` field, like v3. The real MockModel answers. */
const stream = ({ message = 'say hello world', promptId, courseId }: { message?: string; promptId?: string; courseId?: string } = {}) => {
  const form = new FormData()
  form.append(
    'data',
    JSON.stringify({
      options: {
        chatMessages: [{ role: 'user', content: message }],
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
