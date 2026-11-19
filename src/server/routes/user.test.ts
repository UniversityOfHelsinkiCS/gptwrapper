// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import express from 'express'
import { startTestServer } from '../tests/testServer'

vi.mock('../db/models', () => ({
  User: { update: vi.fn(), findByPk: vi.fn(), upsert: vi.fn() },
}))

vi.mock('../services/chatInstances/access', () => ({ ensureSandboxAccess: vi.fn() }))
vi.mock('../services/chatInstances/usage', () => ({
  getUserStatus: vi.fn(),
  getUsage: vi.fn(),
  getCourseUsages: vi.fn(),
  getUserTokenLimit: vi.fn(),
}))
vi.mock('../services/chatInstances/costBudget', () => ({ getCostUserStatus: vi.fn() }))
vi.mock('../util/lastRestart', () => ({ getLastRestart: vi.fn() }))

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}))

import { User } from '../db/models'
import { getUsage, getUserStatus, getUserTokenLimit } from '../services/chatInstances/usage'
import { getCostUserStatus } from '../services/chatInstances/costBudget'
import userRouter from './user'

let currentUser: { id: string; isAdmin: boolean }
let hijackedBy: { id: string; isAdmin: boolean } | undefined

// startTestServer only injects req.user, so set req.hijackedBy here like the user middleware does.
const router = express.Router()
router.use((req, _res, next) => {
  ;(req as any).hijackedBy = hijackedBy
  next()
})
router.use(userRouter)

const api = startTestServer('/users', router, () => currentUser)

describe('POST /users/accept-terms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = { id: 'student-1', isAdmin: false }
    hijackedBy = undefined
  })

  test('stores the acceptance for the current user', async () => {
    const res = await api.fetch('/users/accept-terms', { method: 'POST' })

    expect(res.status).toBe(200)
    expect(User.update).toHaveBeenCalledTimes(1)
    expect(vi.mocked(User.update).mock.calls[0][1]).toEqual({ where: { id: 'student-1' } })
  })

  test('does not store the acceptance when an admin is logged in as the user', async () => {
    hijackedBy = { id: 'admin-1', isAdmin: true }

    const res = await api.fetch('/users/accept-terms', { method: 'POST' })

    expect(res.status).toBe(200)
    expect(User.update).not.toHaveBeenCalled()
  })
})

describe('GET /users/status', () => {
  const costStatus = {
    mode: 'cost',
    usage: 1.2,
    limit: 5,
    budget: { limit: 5, base: 2.5, bonuses: [{ courseId: 'otm-1', name: { fi: 'Kurssi' }, percent: 100 }] },
    resetsAt: '2026-11-23T00:01:00.000Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = { id: 'student-1', isAdmin: false }
    hijackedBy = undefined
    vi.mocked(getUsage).mockResolvedValue(1_000)
    vi.mocked(getUserTokenLimit).mockResolvedValue(200_000)
    vi.mocked(getUserStatus).mockResolvedValue({ usage: 30, limit: 100 })
    vi.mocked(getCostUserStatus).mockResolvedValue(costStatus as any)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('under tokens, returns the general chat tokens and limit', async () => {
    const res = await api.fetch('/users/status')

    expect(await res.json()).toEqual({ mode: 'tokens', usage: 1_000, limit: 200_000 })
    expect(getCostUserStatus).not.toHaveBeenCalled()
  })

  test("under tokens, returns the course's tokens and limit", async () => {
    const res = await api.fetch('/users/status/otm-1')

    expect(await res.json()).toEqual({ mode: 'tokens', usage: 30, limit: 100 })
    expect(getUserStatus).toHaveBeenCalledWith(currentUser, 'otm-1')
  })

  test('under cost, returns the weekly cost, budget and reset time, the same with or without a course', async () => {
    vi.stubEnv('USAGE_ENFORCEMENT', 'cost')

    const general = await (await api.fetch('/users/status')).json()
    const course = await (await api.fetch('/users/status/otm-1')).json()

    expect(general).toEqual(costStatus)
    expect(course).toEqual(costStatus)
    expect(getCostUserStatus).toHaveBeenCalledWith(currentUser)
    expect(getUserStatus).not.toHaveBeenCalled()
    expect(getUsage).not.toHaveBeenCalled()
  })
})
