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
const expired = { activityPeriod: { startDate: '2020-01-01', endDate: '2020-06-01' }, activated: true }

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

const getUsages = (id = 'ci-1') => api.fetch(`/chatinstances/${id}/usages`)

const resetUsage = (id = 'usage-1') => api.fetch(`/chatinstances/usage/${id}`, { method: 'DELETE' })

describe('GET /chatinstances/:id/usages', () => {
  test('admin gets 200 with the usages', async () => {
    users.admin()
    const response = await getUsages()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toHaveLength(1)
  })

  test('responsible teacher gets 200 with the usages', async () => {
    users.teacher()
    const response = await getUsages()
    expect(response.status).toBe(200)
  })

  test('responsible teacher gets 200 on an expired course', async () => {
    users.teacher()
    vi.mocked(ChatInstance.findByPk).mockResolvedValue(chatInstanceFixture(expired) as any)
    const response = await getUsages()
    expect(response.status).toBe(200)
  })

  test('enrolled student gets 403', async () => {
    users.student()
    const response = await getUsages()
    expect(response.status).toBe(403)
    expect(UserChatInstanceUsage.findAll).not.toHaveBeenCalled()
  })

  test('enrolled student on an expired course gets 403', async () => {
    users.student()
    vi.mocked(ChatInstance.findByPk).mockResolvedValue(chatInstanceFixture(expired) as any)
    const response = await getUsages()
    expect(response.status).toBe(403)
  })

  test('outsider gets 403', async () => {
    users.outsider()
    const response = await getUsages()
    expect(response.status).toBe(403)
  })

  test('404 when the chat instance does not exist', async () => {
    users.admin()
    vi.mocked(ChatInstance.findByPk).mockResolvedValue(null)
    const response = await getUsages()
    expect(response.status).toBe(404)
  })
})

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
