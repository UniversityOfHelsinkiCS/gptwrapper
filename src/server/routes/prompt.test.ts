// @vitest-environment node
import 'express-async-errors'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

// `src/config.ts` parses DEFAULT_MODEL / FREE_MODEL at import time, and vite.config's `define` bakes those in as
// the literal string "undefined" when the variables are unset (as they are under `npm run test`). The router only
// reaches config transitively, through the zod schemas in `shared/chat`, so stubbing it keeps the test hermetic.
vi.mock('../../config', async () => {
  const { z } = await import('zod/v4')
  return {
    ValidModelNameSchema: z.string(),
    DEFAULT_TOKEN_LIMIT: 200_000,
    inProduction: false,
    inStaging: false,
    inDevelopment: false,
    inCI: false,
  }
})

vi.mock('../db/models', () => ({
  Prompt: { findByPk: vi.fn(), findAll: vi.fn(), count: vi.fn(), create: vi.fn() },
  ChatInstance: { findByPk: vi.fn() },
  RagIndex: {},
  Responsibility: {},
  PromptChatInstance: { create: vi.fn(), destroy: vi.fn() },
}))

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}))

import promptRouter from './prompt'
import errorHandler from '../middleware/error'
import { ChatInstance, Prompt } from '../db/models'

/**
 * The routers assume `req.user` is already populated by the user middleware, so the test app injects it
 * directly. Everything below the router (models, logger) is mocked; this exercises the route's own
 * authorization logic, not the database.
 */
let currentUser: { id: string; isAdmin: boolean }
let server: Server
let baseUrl: string

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    ;(req as any).user = currentUser
    next()
  })
  app.use('/prompts', promptRouter)
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
  currentUser = { id: 'student-1', isAdmin: false }
  vi.mocked(Prompt.count).mockResolvedValue(0)
  vi.mocked(Prompt.findAll).mockResolvedValue([])
  vi.mocked(Prompt.create).mockImplementation(async (params: any) => ({ id: 'new-prompt', ...params }) as any)
})

const copy = (id: string, body: unknown) =>
  fetch(`${baseUrl}/prompts/${id}/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const sourcePrompt = (overrides: Record<string, unknown>) =>
  ({
    id: 'source-1',
    userId: 'admin-1',
    name: 'Essay helper',
    userInstructions: '',
    systemMessage: 'You help with essays',
    messages: [],
    hidden: false,
    ragHidden: false,
    ragIndexId: null,
    ragIndex: null,
    chatInstanceId: null,
    language: null,
    ...overrides,
  }) as any

describe('POST /prompts/:id/copy', () => {
  test('lets a student copy a university TEMPLATE into their own prompts', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'TEMPLATE', language: 'fi' }))

    const response = await copy('source-1', { target: { type: 'PERSONAL' } })

    expect(response.status).toBe(201)
    const created = await response.json()
    expect(created).toMatchObject({ type: 'PERSONAL', userId: 'student-1', name: 'Essay helper' })
    // The copy is an ordinary personal prompt: no university grouping travels with it.
    expect(vi.mocked(Prompt.create).mock.calls[0][0]).not.toHaveProperty('universityPromptId')
    expect(vi.mocked(Prompt.create).mock.calls[0][0]).not.toHaveProperty('language')
  })

  test('stops a student copying a TEMPLATE into a course they are not responsible for', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'TEMPLATE' }))
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1', responsibilities: [] } as any)

    const response = await copy('source-1', { target: { type: 'CHAT_INSTANCE', chatInstanceId: 'course-1' } })

    expect(response.status).toBe(403)
    expect(Prompt.create).not.toHaveBeenCalled()
  })

  test('lets a responsible teacher copy a TEMPLATE into their course', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'TEMPLATE' }))
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1', responsibilities: [{ id: 1, userId: 'teacher-1' }] } as any)

    const response = await copy('source-1', { target: { type: 'CHAT_INSTANCE', chatInstanceId: 'course-1' } })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ type: 'CHAT_INSTANCE', chatInstanceId: 'course-1' })
  })

  test('refuses to copy a UNIVERSITY prompt, even for an admin', async () => {
    currentUser = { id: 'admin-1', isAdmin: true }
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'UNIVERSITY' }))

    const response = await copy('source-1', { target: { type: 'PERSONAL' } })

    expect(response.status).toBe(403)
    expect(Prompt.create).not.toHaveBeenCalled()
  })

  test('still refuses to copy a course prompt from a course the student is not responsible for', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'CHAT_INSTANCE', chatInstanceId: 'course-1' }))
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1', responsibilities: [] } as any)

    const response = await copy('source-1', { target: { type: 'PERSONAL' } })

    expect(response.status).toBe(403)
    expect(Prompt.create).not.toHaveBeenCalled()
  })
})

describe('university types are locked out of /prompts mutations', () => {
  test('PUT /prompts/:id on a UNIVERSITY prompt is 403, not 500', async () => {
    currentUser = { id: 'admin-1', isAdmin: true }
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'UNIVERSITY' }))

    const response = await fetch(`${baseUrl}/prompts/source-1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed', userInstructions: '', systemMessage: 'x' }),
    })

    expect(response.status).toBe(403)
  })

  test('DELETE /prompts/:id on a TEMPLATE prompt is 403, not 500', async () => {
    currentUser = { id: 'admin-1', isAdmin: true }
    const prompt = sourcePrompt({ type: 'TEMPLATE' })
    prompt.destroy = vi.fn()
    vi.mocked(Prompt.findByPk).mockResolvedValue(prompt)

    const response = await fetch(`${baseUrl}/prompts/source-1`, { method: 'DELETE' })

    expect(response.status).toBe(403)
    expect(prompt.destroy).not.toHaveBeenCalled()
  })
})
