// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { startTestServer } from '../tests/testServer'

vi.mock('../db/models', () => ({
  ChatInstance: { findAndCountAll: vi.fn() },
  UserChatInstanceUsage: {},
  User: {},
}))

vi.mock('../db/connection', () => ({
  sequelize: { escape: (value: string) => `'${value}'`, literal: (value: string) => value },
}))

vi.mock('../util/importer', () => ({ getCourse: vi.fn() }))
vi.mock('../updater', () => ({ run: vi.fn() }))

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}))

import { ChatInstance } from '../db/models'
import adminRouter from './admin'

let currentUser: { id: string; isAdmin: boolean }

const api = startTestServer('/admin', adminRouter, () => currentUser)

const chatInstanceRow = (overrides: Record<string, unknown> = {}) => ({
  courseId: 'cur-1',
  name: { en: 'Intro', fi: 'Intro', sv: 'Intro' },
  courseUnits: [{ code: 'TKT10003' }, { code: 'TKT10003' }],
  courseActivityPeriod: null,
  saveDiscussions: true,
  ...overrides,
})

describe('GET /admin/chatinstance-search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = { id: 'admin-1', isAdmin: true }
  })

  test('returns saveDiscussions for each result', async () => {
    vi.mocked(ChatInstance.findAndCountAll).mockResolvedValue({
      rows: [chatInstanceRow(), chatInstanceRow({ courseId: 'cur-2', saveDiscussions: false })],
      count: 2,
    } as any)

    const res = await api.fetch(`/admin/chatinstance-search?search=intro&language=en`)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.count).toBe(2)
    expect(body.results.map((r: any) => [r.id, r.saveDiscussions])).toEqual([
      ['cur-1', true],
      ['cur-2', false],
    ])
    expect(body.results[0].codes).toEqual(['TKT10003'])
    expect(vi.mocked(ChatInstance.findAndCountAll).mock.calls[0][0]?.attributes).toContain('saveDiscussions')
  })

  test('defaults a missing saveDiscussions to false', async () => {
    vi.mocked(ChatInstance.findAndCountAll).mockResolvedValue({
      rows: [chatInstanceRow({ saveDiscussions: undefined })],
      count: 1,
    } as any)

    const res = await api.fetch(`/admin/chatinstance-search?search=intro&language=en`)
    const body = await res.json()

    expect(body.results[0].saveDiscussions).toBe(false)
  })

  test('rejects non-admins', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }

    const res = await api.fetch(`/admin/chatinstance-search?search=intro&language=en`)

    expect(res.status).toBe(403)
    expect(ChatInstance.findAndCountAll).not.toHaveBeenCalled()
  })
})
