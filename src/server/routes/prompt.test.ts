// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { startTestServer } from '../tests/testServer'
import { setMembership } from '../tests/membership'

vi.mock('../db/models', () => ({
  Prompt: { findByPk: vi.fn(), findAll: vi.fn(), count: vi.fn(), create: vi.fn() },
  ChatInstance: { findByPk: vi.fn() },
  RagIndex: {},
  Responsibility: { findOne: vi.fn() },
  Enrolment: { findOne: vi.fn() },
  PromptChatInstance: { create: vi.fn(), destroy: vi.fn() },
  User: {},
}))

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}))

import promptRouter from './prompt'
import { ChatInstance, Prompt } from '../db/models'

/**
 * Everything below the router (models, logger) is mocked; this exercises the route's own
 * authorization logic, not the database.
 */
let currentUser: { id: string; isAdmin: boolean }

const api = startTestServer('/prompts', promptRouter, () => currentUser)

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'student-1', isAdmin: false }
  setMembership({})
  vi.mocked(Prompt.count).mockResolvedValue(0)
  vi.mocked(Prompt.findAll).mockResolvedValue([])
  vi.mocked(Prompt.create).mockImplementation(async (params: any) => ({ id: 'new-prompt', ...params }) as any)
})

const copy = (id: string, body: unknown) =>
  api.fetch(`/prompts/${id}/copy`, {
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
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1' } as any)

    const response = await copy('source-1', { target: { type: 'CHAT_INSTANCE', chatInstanceId: 'course-1' } })

    expect(response.status).toBe(403)
    expect(Prompt.create).not.toHaveBeenCalled()
  })

  test('lets a responsible teacher copy a TEMPLATE into their course', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'TEMPLATE' }))
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1' } as any)
    setMembership({ responsible: true })

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
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1' } as any)

    const response = await copy('source-1', { target: { type: 'PERSONAL' } })

    expect(response.status).toBe(403)
    expect(Prompt.create).not.toHaveBeenCalled()
  })
})

describe('university types are locked out of /prompts mutations', () => {
  test('PUT /prompts/:id on a UNIVERSITY prompt is 403, not 500', async () => {
    currentUser = { id: 'admin-1', isAdmin: true }
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'UNIVERSITY' }))

    const response = await api.fetch(`/prompts/source-1`, {
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

    const response = await api.fetch(`/prompts/source-1`, { method: 'DELETE' })

    expect(response.status).toBe(403)
    expect(prompt.destroy).not.toHaveBeenCalled()
  })
})
