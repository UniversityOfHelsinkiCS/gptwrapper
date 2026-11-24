// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { startTestServer } from '../tests/testServer'
import { setMembership } from '../tests/membership'

vi.mock('../db/models', () => ({
  ChatInstance: { findByPk: vi.fn() },
  Enrolment: { findOne: vi.fn() },
  Prompt: {},
  RagIndex: {},
  Responsibility: { findOne: vi.fn() },
  User: {},
  UserChatInstanceUsage: { findAll: vi.fn(), findByPk: vi.fn() },
}))

vi.mock('../db/connection', () => ({ sequelize: {} }))

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}))

import chatInstanceRouter from './chatInstance'
import { ChatInstance, UserChatInstanceUsage } from '../db/models'

let currentUser: { id: string; isAdmin: boolean }

const api = startTestServer('/chatinstances', chatInstanceRouter, () => currentUser)

const open = { activityPeriod: { startDate: '2026-01-01', endDate: '2062-12-31' }, activated: true }

const chatInstanceFixture = (overrides = {}) => ({
  id: 'ci-1',
  courseId: 'course-1',
  usageLimit: 1000,
  saveDiscussions: false,
  ...open,
  ...overrides,
})

const usageFixture = () => ({
  id: 'usage-1',
  userId: 'student-1',
  chatInstanceId: 'ci-1',
  usageCount: 500,
  weeklyModelUsage: { 'gpt-4o': { input: 1, cachedInput: 0, cacheWrite: 0, output: 1 } } as Record<string, unknown>,
  totalModelUsage: { 'gpt-4o': { input: 9, cachedInput: 0, cacheWrite: 0, output: 9 } },
  user: { id: 'student-1' },
  save: vi.fn(),
  toJSON() {
    return { id: this.id, userId: this.userId, usageCount: this.usageCount }
  },
})

const users = {
  admin: () => {
    currentUser = { id: 'admin-1', isAdmin: true }
  },
  teacher: () => {
    currentUser = { id: 'teacher-1', isAdmin: false }
    setMembership({ responsible: true })
  },
  student: () => {
    currentUser = { id: 'student-1', isAdmin: false }
    setMembership({ enrolled: true })
  },
  outsider: () => {
    currentUser = { id: 'outsider-1', isAdmin: false }
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  setMembership({})
  vi.mocked(ChatInstance.findByPk).mockResolvedValue(chatInstanceFixture() as any)
  vi.mocked(UserChatInstanceUsage.findAll).mockResolvedValue([usageFixture()] as any)
})

const resetUsage = (id = 'usage-1') => api.fetch(`/chatinstances/usage/${id}`, { method: 'DELETE' })

describe('DELETE /chatinstances/usage/:id', () => {
  test('responsible teacher resets the usage to 0', async () => {
    users.teacher()
    const usage = usageFixture()
    vi.mocked(UserChatInstanceUsage.findByPk).mockResolvedValue(usage as any)
    const response = await resetUsage()
    expect(response.status).toBe(204)
    expect(usage.usageCount).toBe(0)
    expect(usage.save).toHaveBeenCalled()
  })

  test('empties the weekly usage by model and keeps the total', async () => {
    users.teacher()
    const usage = usageFixture()
    vi.mocked(UserChatInstanceUsage.findByPk).mockResolvedValue(usage as any)
    await resetUsage()
    expect(usage.weeklyModelUsage).toEqual({})
    expect(usage.totalModelUsage).toEqual({ 'gpt-4o': { input: 9, cachedInput: 0, cacheWrite: 0, output: 9 } })
  })

  test('admin resets the usage to 0', async () => {
    users.admin()
    const usage = usageFixture()
    vi.mocked(UserChatInstanceUsage.findByPk).mockResolvedValue(usage as any)
    const response = await resetUsage()
    expect(response.status).toBe(204)
    expect(usage.usageCount).toBe(0)
  })

  test('enrolled student gets 403 and the usage is kept', async () => {
    users.student()
    const usage = usageFixture()
    vi.mocked(UserChatInstanceUsage.findByPk).mockResolvedValue(usage as any)
    const response = await resetUsage()
    expect(response.status).toBe(403)
    expect(usage.usageCount).toBe(500)
    expect(usage.weeklyModelUsage).not.toEqual({})
    expect(usage.save).not.toHaveBeenCalled()
  })

  test('outsider gets 403', async () => {
    users.outsider()
    vi.mocked(UserChatInstanceUsage.findByPk).mockResolvedValue(usageFixture() as any)
    const response = await resetUsage()
    expect(response.status).toBe(403)
  })

  test('404 when the usage does not exist', async () => {
    users.teacher()
    vi.mocked(UserChatInstanceUsage.findByPk).mockResolvedValue(null)
    const response = await resetUsage()
    expect(response.status).toBe(404)
  })
})
