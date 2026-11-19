// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AIMessageChunk } from '@langchain/core/messages'
import { startTestServer } from '../../tests/testServer'

const upstream = vi.hoisted(() => ({ chunks: [] as unknown[] }))

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: class {
    async stream() {
      return (async function* () {
        yield* upstream.chunks
      })()
    }
  },
}))

vi.mock('../../db/models', () => ({
  ApiKey: { findOne: vi.fn() },
  User: { findByPk: vi.fn() },
}))

vi.mock('../../services/chatInstances/usage', () => ({
  checkUsage: vi.fn(() => true),
  getUserTokenLimit: vi.fn(async () => 1_000_000),
  incrementUsage: vi.fn(),
}))

vi.mock('../../services/chatInstances/modelUsage', () => ({ recordModelUsage: vi.fn() }))

vi.mock('../../services/chatInstances/costBudget', async (importOriginal) => ({
  getBudgetUsage: vi.fn(),
  isBudgetExhausted: (await importOriginal<typeof import('../../services/chatInstances/costBudget')>()).isBudgetExhausted,
}))

vi.mock('../../util/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

import { ApiKey, User } from '../../db/models'
import { checkUsage, incrementUsage } from '../../services/chatInstances/usage'
import { recordModelUsage } from '../../services/chatInstances/modelUsage'
import { getBudgetUsage } from '../../services/chatInstances/costBudget'
import { api as externalApi } from './openai'

const api = startTestServer('/external', externalApi)

const user = { id: 'api-user', username: 'api', isAdmin: false, usage: 0 }

const complete = (model: string) =>
  api.fetch('/external/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer key-1' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hi' }], stream: false }),
  })

describe('POST /external/v1/chat/completions usage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ApiKey.findOne).mockResolvedValue({ userId: user.id, name: 'key' } as any)
    vi.mocked(User.findByPk).mockResolvedValue({ toJSON: () => user } as any)
  })

  test('records the usage under the requested model, cache reads apart from uncached input', async () => {
    upstream.chunks = [
      new AIMessageChunk({ content: 'Hello' }),
      new AIMessageChunk({
        content: '',
        usage_metadata: { input_tokens: 1000, output_tokens: 20, total_tokens: 1020, input_token_details: { cache_read: 800 } },
      }),
    ]

    const res = await complete('gpt-6-luna')

    expect(res.status).toBe(200)
    expect(recordModelUsage).toHaveBeenCalledWith({
      userId: 'api-user',
      usage: { 'gpt-6-luna': { input: 200, cachedInput: 800, cacheWrite: 0, output: 20 } },
    })
  })

  test('keeps charging the token counter as before', async () => {
    upstream.chunks = [
      new AIMessageChunk({
        content: 'Hello',
        usage_metadata: { input_tokens: 1000, output_tokens: 20, total_tokens: 1020, input_token_details: { cache_read: 800 } },
      }),
    ]

    await complete('gpt-6-luna')

    // input + output - 70% of the cache reads
    expect(incrementUsage).toHaveBeenCalledWith(expect.objectContaining({ id: 'api-user' }), 1000 + 20 - 560)
  })

  test('without usage metadata, the answer length counts as output, like the token counter', async () => {
    upstream.chunks = [new AIMessageChunk({ content: 'Hello' })]

    await complete('gpt-6-luna')

    expect(incrementUsage).toHaveBeenCalledWith(expect.objectContaining({ id: 'api-user' }), 5)
    expect(recordModelUsage).toHaveBeenCalledWith({ userId: 'api-user', usage: { 'gpt-6-luna': { input: 0, cachedInput: 0, cacheWrite: 0, output: 5 } } })
  })

  test('records nothing when the user is over the limit', async () => {
    vi.mocked(checkUsage).mockReturnValueOnce(false)

    const res = await complete('gpt-6-luna')

    expect(res.status).toBe(429)
    expect(recordModelUsage).not.toHaveBeenCalled()
  })

  test('rejects a request without an API key', async () => {
    const res = await api.fetch('/external/v1/chat/completions', { method: 'POST' })

    expect(res.status).toBe(401)
    expect(recordModelUsage).not.toHaveBeenCalled()
  })
})

describe('POST /external/v1/chat/completions under USAGE_ENFORCEMENT=cost', () => {
  const budget = { limit: 2.5, base: 2.5, bonuses: [] }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('USAGE_ENFORCEMENT', 'cost')
    vi.mocked(ApiKey.findOne).mockResolvedValue({ userId: user.id, name: 'key' } as any)
    vi.mocked(User.findByPk).mockResolvedValue({ toJSON: () => user } as any)
    vi.mocked(getBudgetUsage).mockResolvedValue({ cost: 1, budget })
    upstream.chunks = [new AIMessageChunk({ content: 'Hello', usage_metadata: { input_tokens: 10, output_tokens: 2, total_tokens: 12 } })]
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('answers under the budget, without the token limit check', async () => {
    const res = await complete('gpt-6-luna')

    expect(res.status).toBe(200)
    expect(getBudgetUsage).toHaveBeenCalledWith(expect.objectContaining({ id: 'api-user' }))
    expect(checkUsage).not.toHaveBeenCalled()
    expect(recordModelUsage).toHaveBeenCalled()
  })

  test('refuses with 403 at the budget limit, on an otherwise unlimited model too', async () => {
    vi.mocked(getBudgetUsage).mockResolvedValue({ cost: 2.5, budget })

    const res = await complete('gpt-6-luna')

    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe('usage_limit_reached')
    expect(recordModelUsage).not.toHaveBeenCalled()
  })

  test('lets an admin over the budget through', async () => {
    vi.mocked(User.findByPk).mockResolvedValue({ toJSON: () => ({ ...user, isAdmin: true }) } as any)
    vi.mocked(getBudgetUsage).mockResolvedValue({ cost: 10, budget })

    const res = await complete('gpt-6-luna')

    expect(res.status).toBe(200)
  })
})
