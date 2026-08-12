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
import { Prompt } from '../../db/models'
import { streamChat } from '../../services/langchain/chat'

let server: Server
let baseUrl: string

beforeAll(async () => {
  const app = express()
  app.use((req, res, next) => {
    ;(req as any).user = { id: 'student-1', isAdmin: false }
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
const stream = (promptId: string) => {
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
    }),
  )

  return fetch(`${baseUrl}/ai/v3/stream`, { method: 'POST', body: form })
}

const savedPrompt = (type: string) =>
  ({
    id: 'prompt-1',
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
