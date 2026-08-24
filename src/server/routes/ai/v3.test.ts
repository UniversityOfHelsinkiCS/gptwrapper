// @vitest-environment node
import 'express-async-errors'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../../db/models', () => ({
  ChatInstance: { findOne: vi.fn() },
  Discussion: { create: vi.fn() },
  Enrolment: {},
  Prompt: { findByPk: vi.fn() },
  PromptUsage: { create: vi.fn() },
  RagIndex: {},
  Responsibility: {},
  UserChatInstanceUsage: { findOrCreate: vi.fn() },
}))

vi.mock('../../services/chatInstances/usage', () => ({
  checkCourseUsage: vi.fn(() => true),
  checkUsage: vi.fn(() => true),
  getUserTokenLimit: vi.fn(() => 100_000),
  incrementCourseUsage: vi.fn(),
  incrementUsage: vi.fn(),
}))

vi.mock('../../services/langchain/chat', () => ({
  streamChat: vi.fn(),
}))

vi.mock('../../services/rag/searchTool', () => ({ getRagIndexSearchTool: vi.fn() }))
vi.mock('../../services/rag/mockSearchTool', () => ({ getMockRagIndexSearchTool: vi.fn() }))

vi.mock('../../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({ captureException: vi.fn() }))

import v3Router from './v3'
import errorHandler from '../../middleware/error'
import { Prompt, ChatInstance, UserChatInstanceUsage } from '../../db/models'
import { streamChat } from '../../services/langchain/chat'

let server: Server
let baseUrl: string
let currentUser = { id: 'user-1', isAdmin: false }

beforeAll(async () => {
  const app = express()
  app.use((req, res, next) => {
    ;(req as any).user = currentUser
    res.locals = res.locals ?? {}
    next()
  })
  app.use('/ai/v3', v3Router)
  app.use(errorHandler)

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve())
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
})

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'user-1', isAdmin: false }
  vi.mocked(streamChat).mockResolvedValue({
    inputTokenCount: 1,
    tokenCount: 2,
    timeToFirstToken: 3,
    tokensPerSecond: 4,
    toolCalls: [],
    response: 'ok',
  } as any)
})

/** The /stream route reads its JSON payload out of a multipart `data` field, alongside the optional file upload. */
const stream = (promptId: string, courseId?: string) => {
  const form = new FormData()
  form.append(
    'data',
    JSON.stringify({
      options: {
        chatMessages: [{ role: 'user', content: 'hello' }],
        generationInfo: {
          model: 'mock',
          promptInfo: { type: 'saved', id: promptId, name: 'Essay helper' },
        },
      },
      ...(courseId ? { courseId } : {}),
    }),
  )

  return fetch(`${baseUrl}/ai/v3/stream`, { method: 'POST', body: form })
}

/** PERSONAL prompts are refused with a 404 unless `userId` matches the requesting user. */
const savedPrompt = (type: string, userId = 'user-1') =>
  ({
    id: 'prompt-1',
    userId,
    name: 'Essay helper',
    type,
    systemMessage: 'You help with essays',
    messages: [],
    language: type === 'UNIVERSITY' ? 'fi' : null,
    ragIndex: null,
  }) as any

describe('POST /ai/v3/stream with a saved prompt', () => {
  test('refuses to chat with a TEMPLATE prompt', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(savedPrompt('TEMPLATE'))

    const response = await stream('prompt-1')

    expect(response.status).toBe(403)
    expect(streamChat).not.toHaveBeenCalled()
  })

  test('chats with a UNIVERSITY prompt', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(savedPrompt('UNIVERSITY'))

    const response = await stream('prompt-1')
    await response.text()

    expect(response.status).toBe(200)
    expect(streamChat).toHaveBeenCalledWith(expect.objectContaining({ systemMessage: 'You help with essays' }))
  })

  test('chats with an ordinary PERSONAL prompt', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(savedPrompt('PERSONAL'))

    const response = await stream('prompt-1')
    await response.text()

    expect(response.status).toBe(200)
    expect(streamChat).toHaveBeenCalled()
  })
})

/**
 * Defaults describe a course a student may chat in: activated, inside its activity period, with a
 * usage limit left. Each test switches off exactly one of those, so it fails for one reason.
 */
const courseFixture = (overrides = {}) =>
  ({
    id: 'ci-1',
    name: { fi: 'Kurssi' },
    activated: true,
    activityPeriod: { startDate: '2020-01-01', endDate: '2099-01-01' },
    usageLimit: 10,
    enrolments: [{ userId: 'user-1' }],
    responsibilities: [],
    ...overrides,
  }) as any

const givenCourse = (overrides = {}) => {
  vi.mocked(ChatInstance.findOne).mockResolvedValue(courseFixture(overrides))
  vi.mocked(UserChatInstanceUsage.findOrCreate).mockResolvedValue([{}, false] as any)
  vi.mocked(Prompt.findByPk).mockResolvedValue(savedPrompt('CHAT_INSTANCE'))
}

const expired = { activityPeriod: { startDate: '2020-01-01', endDate: '2020-06-01' } }
const notStarted = { activityPeriod: { startDate: '2099-01-01', endDate: '2099-06-01' } }
/** The real query filters both includes on the current user, so a teacher has no enrolment row. */
const teaching = { enrolments: [], responsibilities: [{ userId: 'teacher-1' }] }

describe('POST /ai/v3/stream as an enrolled student', () => {
  test('chats in an active course', async () => {
    givenCourse()

    const response = await stream('prompt-1', 'course-1')
    await response.text()

    expect(response.status).toBe(200)
    expect(streamChat).toHaveBeenCalled()
  })

  test('is refused when the course has ended', async () => {
    givenCourse(expired)

    const response = await stream('prompt-1', 'course-1')
    await response.text()

    expect(response.status).toBe(403)
    expect(streamChat).not.toHaveBeenCalled()
  })

  test('is refused when the course has not started', async () => {
    givenCourse(notStarted)

    const response = await stream('prompt-1', 'course-1')
    await response.text()

    expect(response.status).toBe(403)
    expect(streamChat).not.toHaveBeenCalled()
  })

  test('is refused when the course chat is not activated', async () => {
    givenCourse({ activated: false })

    const response = await stream('prompt-1', 'course-1')
    await response.text()

    expect(response.status).toBe(403)
    expect(streamChat).not.toHaveBeenCalled()
  })
})

describe('POST /ai/v3/stream as a responsible teacher', () => {
  beforeEach(() => {
    currentUser = { id: 'teacher-1', isAdmin: false }
  })

  test('chats in a course that has ended', async () => {
    givenCourse({ ...teaching, ...expired })

    const response = await stream('prompt-1', 'course-1')
    await response.text()

    expect(response.status).toBe(200)
    expect(streamChat).toHaveBeenCalled()
  })

  test('chats in a course that is not activated', async () => {
    givenCourse({ ...teaching, activated: false })

    const response = await stream('prompt-1', 'course-1')
    await response.text()

    expect(response.status).toBe(200)
    expect(streamChat).toHaveBeenCalled()
  })
})

describe('POST /ai/v3/stream as an admin', () => {
  test('chats in a course that is neither activated nor running', async () => {
    currentUser = { id: 'admin-1', isAdmin: true }
    givenCourse({ ...expired, activated: false, enrolments: [], responsibilities: [] })

    const response = await stream('prompt-1', 'course-1')
    await response.text()

    expect(response.status).toBe(200)
    expect(streamChat).toHaveBeenCalled()
  })
})
