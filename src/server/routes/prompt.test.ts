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

// The tool registry imports the RAG search, which needs the vector DB.
vi.mock('../services/rag/search', () => ({ search: vi.fn() }))
vi.mock('../services/langchain/fileSearchResultsStore', () => ({ ToolResultStore: { saveResults: vi.fn() } }))

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
    expect(await response.json()).toMatchObject({ type: 'CHAT_INSTANCE', chatInstanceId: 'course-1', published: false })
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

describe('published state of course prompts', () => {
  const publish = (id: string, published: boolean) =>
    api.fetch(`/prompts/${id}/published`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published }),
    })

  test('a new course prompt starts as a draft', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1' } as any)
    setMembership({ responsible: true })

    const response = await api.fetch('/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'CHAT_INSTANCE', chatInstanceId: 'course-1', name: 'New', userInstructions: '', systemMessage: 'x' }),
    })

    expect(response.status).toBe(201)
    expect(vi.mocked(Prompt.create).mock.calls[0][0]).toMatchObject({ published: false })
  })

  test('a personal prompt has no published state', async () => {
    const response = await api.fetch('/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PERSONAL', name: 'Mine', userInstructions: '', systemMessage: 'x', published: true }),
    })

    expect(response.status).toBe(201)
    expect(vi.mocked(Prompt.create).mock.calls[0][0]).toMatchObject({ published: null })
  })

  test('the creator can publish their course prompt', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }
    const prompt = sourcePrompt({ type: 'CHAT_INSTANCE', chatInstanceId: 'course-1', userId: 'teacher-1', published: false })
    prompt.save = vi.fn()
    vi.mocked(Prompt.findByPk).mockResolvedValue(prompt)
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1' } as any)

    const response = await publish('source-1', true)

    expect(response.status).toBe(200)
    expect(prompt.published).toBe(true)
    expect(prompt.save).toHaveBeenCalled()
  })

  test('an admin can publish a course prompt', async () => {
    currentUser = { id: 'admin-1', isAdmin: true }
    const prompt = sourcePrompt({ type: 'CHAT_INSTANCE', chatInstanceId: 'course-1', userId: 'teacher-1', published: false })
    prompt.save = vi.fn()
    vi.mocked(Prompt.findByPk).mockResolvedValue(prompt)
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1' } as any)

    const response = await publish('source-1', true)

    expect(response.status).toBe(200)
    expect(prompt.published).toBe(true)
    expect(prompt.save).toHaveBeenCalled()
  })

  test('someone else cannot publish a course prompt', async () => {
    const prompt = sourcePrompt({ type: 'CHAT_INSTANCE', chatInstanceId: 'course-1', userId: 'teacher-1', published: false })
    prompt.save = vi.fn()
    vi.mocked(Prompt.findByPk).mockResolvedValue(prompt)
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1' } as any)

    const response = await publish('source-1', true)

    expect(response.status).toBe(403)
    expect(prompt.save).not.toHaveBeenCalled()
  })

  test('a personal prompt cannot be published', async () => {
    const prompt = sourcePrompt({ type: 'PERSONAL', userId: 'student-1' })
    prompt.save = vi.fn()
    vi.mocked(Prompt.findByPk).mockResolvedValue(prompt)

    const response = await publish('source-1', true)

    expect(response.status).toBe(400)
    expect(prompt.save).not.toHaveBeenCalled()
  })

  test('GET /prompts/:id hides a draft from a student', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'CHAT_INSTANCE', chatInstanceId: 'course-1', published: false }))
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1' } as any)
    setMembership({ enrolled: true })

    const response = await api.fetch('/prompts/source-1')

    expect(response.status).toBe(404)
  })

  test('GET /prompts/:id shows a draft to a responsible teacher', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'CHAT_INSTANCE', chatInstanceId: 'course-1', published: false }))
    vi.mocked(ChatInstance.findByPk).mockResolvedValue({ id: 'course-1' } as any)
    setMembership({ responsible: true })

    const response = await api.fetch('/prompts/source-1')

    expect(response.status).toBe(200)
  })

  test('GET /prompts/:id treats a legacy course prompt as published', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'CHAT_INSTANCE', chatInstanceId: 'course-1', published: null }))

    const response = await api.fetch('/prompts/source-1')

    expect(response.status).toBe(200)
  })
})

describe('tools of a prompt', () => {
  const create = (body: Record<string, unknown>) =>
    api.fetch('/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PERSONAL', name: 'Quizzer', userInstructions: '', systemMessage: 'x', ...body }),
    })

  const update = (id: string, body: Record<string, unknown>) =>
    api.fetch(`/prompts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Quizzer', userInstructions: '', systemMessage: 'x', ...body }),
    })

  const editablePrompt = (overrides: Record<string, unknown> = {}) => {
    const prompt = sourcePrompt({ type: 'PERSONAL', userId: 'student-1', tools: [], ...overrides })
    prompt.save = vi.fn()
    vi.mocked(Prompt.findByPk).mockResolvedValue(prompt)
    return prompt
  }

  test('a non-admin cannot add an experimental tool', async () => {
    const response = await create({ tools: [{ name: 'present_quiz' }] })

    expect(response.status).toBe(403)
    expect(Prompt.create).not.toHaveBeenCalled()
  })

  test('an admin can add an experimental tool', async () => {
    currentUser = { id: 'admin-1', isAdmin: true }

    const response = await create({ tools: [{ name: 'present_quiz' }] })

    expect(response.status).toBe(201)
    expect(vi.mocked(Prompt.create).mock.calls[0][0]).toMatchObject({ tools: [{ name: 'present_quiz' }] })
  })

  test('a prompt without tools is saved with none', async () => {
    const response = await create({})

    expect(response.status).toBe(201)
    expect(vi.mocked(Prompt.create).mock.calls[0][0]).toMatchObject({ tools: [] })
  })

  test.each([
    ['an unknown tool', [{ name: 'web_search' }]],
    ['a tool that comes from the RAG index', [{ name: 'document_search' }]],
    ['a mock-only tool', [{ name: 'mock_subagent' }]],
    ['the same tool twice', [{ name: 'present_quiz' }, { name: 'present_quiz' }]],
    ['a config for a tool that takes none', [{ name: 'present_quiz', config: { count: 3 } }]],
  ])('rejects %s with 400, even from an admin', async (_, tools) => {
    currentUser = { id: 'admin-1', isAdmin: true }

    const response = await create({ tools })

    expect(response.status).toBe(400)
    expect(Prompt.create).not.toHaveBeenCalled()
  })

  test('a non-admin cannot add an experimental tool to an existing prompt', async () => {
    const prompt = editablePrompt()

    const response = await update('source-1', { tools: [{ name: 'present_quiz' }] })

    expect(response.status).toBe(403)
    expect(prompt.save).not.toHaveBeenCalled()
  })

  test('a non-admin can keep or remove an experimental tool that an admin added', async () => {
    const prompt = editablePrompt({ tools: [{ name: 'present_quiz' }] })

    expect((await update('source-1', { tools: [{ name: 'present_quiz' }] })).status).toBe(200)
    expect(prompt.tools).toEqual([{ name: 'present_quiz' }])

    expect((await update('source-1', { tools: [] })).status).toBe(200)
    expect(prompt.tools).toEqual([])
  })

  test('an update without tools leaves them as they are', async () => {
    const prompt = editablePrompt({ tools: [{ name: 'present_quiz' }] })

    const response = await update('source-1', {})

    expect(response.status).toBe(200)
    expect(prompt.tools).toEqual([{ name: 'present_quiz' }])
  })

  test('a copy keeps only the tools the copying user could add', async () => {
    vi.mocked(Prompt.findByPk).mockResolvedValue(sourcePrompt({ type: 'TEMPLATE', tools: [{ name: 'present_quiz' }, { name: 'removed_tool' }] }))

    expect((await copy('source-1', { target: { type: 'PERSONAL' } })).status).toBe(201)
    expect(vi.mocked(Prompt.create).mock.calls[0][0]).toMatchObject({ tools: [] })

    currentUser = { id: 'admin-1', isAdmin: true }
    expect((await copy('source-1', { target: { type: 'PERSONAL' } })).status).toBe(201)
    expect(vi.mocked(Prompt.create).mock.calls[1][0]).toMatchObject({ tools: [{ name: 'present_quiz' }] })
  })
})
