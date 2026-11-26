// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { startTestServer } from '../tests/testServer'

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}))

import logger from '../util/logger'
import analyticsRouter from './analytics'

const api = startTestServer('/analytics', analyticsRouter, () => ({ id: 'user-1', username: 'student', isAdmin: false }))

const post = (body: unknown) => api.fetch('/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

describe('POST /analytics/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('records a valid event with no user fields and returns 204', async () => {
    const event = { feature: 'my_files', action: 'upload', fileCount: 2, fileType: 'pdf' }
    const res = await post(event)

    expect(res.status).toBe(204)
    expect(vi.mocked(logger.info).mock.calls).toEqual([['FeatureEvent', event]])
  })

  test.each([
    ['an unknown feature', { feature: 'rag', action: 'send' }],
    ['an unknown action', { feature: 'quote', action: 'rewrite' }],
    ['extras on the wrong feature', { feature: 'chat', action: 'send', source: 'quote' }],
    ['an unknown field', { feature: 'chat', action: 'send', courseId: 'hy-opt-cur-1' }],
    ['an array of events', [{ feature: 'chat', action: 'send' }]],
  ])('returns 400 for %s and logs nothing', async (_name, body) => {
    const res = await post(body)

    expect(res.status).toBe(400)
    expect(logger.info).not.toHaveBeenCalled()
  })
})
