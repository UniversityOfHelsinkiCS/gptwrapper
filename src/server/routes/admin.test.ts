// @vitest-environment node
import 'express-async-errors'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

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

import errorHandler from '../middleware/error'
import { ChatInstance } from '../db/models'
import adminRouter from './admin'

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
  app.use('/admin', adminRouter)
  app.use(errorHandler)

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve())
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
})

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

    const res = await fetch(`${baseUrl}/admin/chatinstance-search?search=intro&language=en`)
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

    const res = await fetch(`${baseUrl}/admin/chatinstance-search?search=intro&language=en`)
    const body = await res.json()

    expect(body.results[0].saveDiscussions).toBe(false)
  })

  test('rejects non-admins', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }

    const res = await fetch(`${baseUrl}/admin/chatinstance-search?search=intro&language=en`)

    expect(res.status).toBe(403)
    expect(ChatInstance.findAndCountAll).not.toHaveBeenCalled()
  })
})
