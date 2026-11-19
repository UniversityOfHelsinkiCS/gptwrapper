// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
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
vi.mock('../util/lastRestart', () => ({ getLastRestart: vi.fn() }))

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}))

import { User } from '../db/models'
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
