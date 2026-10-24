// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { startTestServer } from '../tests/testServer'

vi.mock('../db/models', () => ({
  ChatInstance: { findAndCountAll: vi.fn(), findOne: vi.fn() },
  UserChatInstanceUsage: { findAll: vi.fn(), update: vi.fn() },
  User: { findAll: vi.fn() },
  Enrolment: { findAll: vi.fn() },
  Responsibility: { findAll: vi.fn() },
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

import { ChatInstance, UserChatInstanceUsage, User, Enrolment, Responsibility } from '../db/models'
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

describe('GET /admin/courses/:courseId/participants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = { id: 'admin-1', isAdmin: true }
    vi.mocked(ChatInstance.findOne).mockResolvedValue({ id: 'ci-1', courseId: 'cur-1', name: { en: 'Intro' }, usageLimit: 1000 } as any)
    vi.mocked(Responsibility.findAll).mockResolvedValue([{ userId: 'teacher-1' }, { userId: 'both-1' }] as any)
    vi.mocked(Enrolment.findAll).mockResolvedValue([{ userId: 'student-1' }, { userId: 'student-2' }, { userId: 'both-1' }] as any)
    vi.mocked(UserChatInstanceUsage.findAll).mockResolvedValue([
      { id: 'u-1', userId: 'student-1', usageCount: 100, totalUsageCount: 500 },
      { id: 'u-2', userId: 'student-2', usageCount: 300, totalUsageCount: 300 },
    ] as any)
    vi.mocked(User.findAll).mockResolvedValue(
      ['teacher-1', 'both-1', 'student-1', 'student-2'].map((id) => ({
        id,
        username: id,
        firstNames: 'F',
        lastName: 'L',
        studentNumber: null,
        usage: 7,
      })) as any,
    )
  })

  test('merges teachers and students with their usage', async () => {
    const res = await api.fetch('/admin/courses/cur-1/participants')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.course).toEqual({ courseId: 'cur-1', name: { en: 'Intro' }, usageLimit: 1000 })
    expect(body.participants.map((p: any) => [p.id, p.role, p.courseUsageId, p.courseUsage, p.courseTotalUsage, p.usage])).toEqual([
      ['teacher-1', 'teacher', null, 0, 0, 7],
      ['both-1', 'teacher', null, 0, 0, 7],
      ['student-2', 'student', 'u-2', 300, 300, 7],
      ['student-1', 'student', 'u-1', 100, 500, 7],
    ])
    expect(vi.mocked(User.findAll).mock.calls[0][0]?.where).toEqual({ id: ['student-1', 'student-2', 'both-1', 'teacher-1'] })
  })

  test('returns 404 for an unknown course', async () => {
    vi.mocked(ChatInstance.findOne).mockResolvedValue(null)

    const res = await api.fetch('/admin/courses/nope/participants')

    expect(res.status).toBe(404)
  })

  test('rejects non-admins', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }

    const res = await api.fetch('/admin/courses/cur-1/participants')

    expect(res.status).toBe(403)
    expect(ChatInstance.findOne).not.toHaveBeenCalled()
  })
})

describe('DELETE /admin/courses/:courseId/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = { id: 'admin-1', isAdmin: true }
    vi.mocked(ChatInstance.findOne).mockResolvedValue({ id: 'ci-1', courseId: 'cur-1' } as any)
  })

  test('resets the current usage of the course', async () => {
    const res = await api.fetch('/admin/courses/cur-1/usage', { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(UserChatInstanceUsage.update).toHaveBeenCalledWith({ usageCount: 0 }, { where: { chatInstanceId: 'ci-1' } })
  })

  test('returns 404 for an unknown course', async () => {
    vi.mocked(ChatInstance.findOne).mockResolvedValue(null)

    const res = await api.fetch('/admin/courses/nope/usage', { method: 'DELETE' })

    expect(res.status).toBe(404)
    expect(UserChatInstanceUsage.update).not.toHaveBeenCalled()
  })

  test('rejects non-admins', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }

    const res = await api.fetch('/admin/courses/cur-1/usage', { method: 'DELETE' })

    expect(res.status).toBe(403)
    expect(UserChatInstanceUsage.update).not.toHaveBeenCalled()
  })
})
