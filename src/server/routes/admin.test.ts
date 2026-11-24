// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { startTestServer } from '../tests/testServer'

vi.mock('../db/models', () => ({
  ApiKey: { findAll: vi.fn() },
  ChatInstance: { findAndCountAll: vi.fn(), findOne: vi.fn() },
  UserChatInstanceUsage: { findAll: vi.fn(), update: vi.fn(), count: vi.fn() },
  User: { findAll: vi.fn(), findByPk: vi.fn(), update: vi.fn(), count: vi.fn() },
  Enrolment: { findAll: vi.fn() },
  Responsibility: { findAll: vi.fn() },
  Prompt: {},
  RagIndex: {},
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

import { DEFAULT_TOKEN_LIMIT, getModelPrice, WEEKLY_BUDGET } from '@config'
import { ApiKey, ChatInstance, UserChatInstanceUsage, User, Enrolment, Responsibility } from '../db/models'
import { COURSE_TOKEN_BONUS } from '../services/chatInstances/usage'
import { PRICE_BASELINE_MODEL } from '../../shared/usage'
import type { UsageComparisonResponse } from '../../shared/usage'
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

  test('also matches teachers by username or name', async () => {
    vi.mocked(ChatInstance.findAndCountAll).mockResolvedValue({ rows: [], count: 0 } as any)

    await api.fetch(`/admin/chatinstance-search?search=${encodeURIComponent('Matti Meik')}&language=en`)

    const where = vi.mocked(ChatInstance.findAndCountAll).mock.calls[0][0]?.where as any
    const teacherClause = where[Symbol.for('or')].find((c: unknown) => typeof c === 'string' && c.includes('FROM responsibilities'))
    expect(teacherClause).toContain("u.first_names ILIKE '%Matti%' OR u.last_name ILIKE '%Matti%' OR u.username ILIKE '%Matti%'")
    expect(teacherClause).toContain("u.first_names ILIKE '%Meik%' OR u.last_name ILIKE '%Meik%' OR u.username ILIKE '%Meik%'")
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
    vi.mocked(ApiKey.findAll).mockResolvedValue([])
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

  test('lists users with API keys first and includes the key names', async () => {
    vi.mocked(ApiKey.findAll).mockResolvedValue([
      { userId: 'student-1', name: 'script' },
      { userId: 'student-1', name: 'notebook' },
    ] as any)

    const res = await api.fetch('/admin/courses/cur-1/participants')
    const body = await res.json()

    expect(body.participants.map((p: any) => [p.id, p.apiKeyNames])).toEqual([
      ['student-1', ['script', 'notebook']],
      ['teacher-1', []],
      ['both-1', []],
      ['student-2', []],
    ])
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

describe('GET /admin/api-users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = { id: 'admin-1', isAdmin: true }
    vi.mocked(ApiKey.findAll).mockResolvedValue([
      { userId: 'user-1', name: 'a' },
      { userId: 'user-2', name: 'b' },
      { userId: 'user-2', name: 'c' },
    ] as any)
    vi.mocked(User.findAll).mockResolvedValue(
      ['user-1', 'user-2'].map((id) => ({ id, username: id, firstNames: 'F', lastName: 'L', studentNumber: null, usage: 3 })) as any,
    )
  })

  test('lists users with API keys, most keys first', async () => {
    const res = await api.fetch('/admin/api-users')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.map((u: any) => [u.id, u.apiKeyNames, u.usage])).toEqual([
      ['user-2', ['b', 'c'], 3],
      ['user-1', ['a'], 3],
    ])
    expect(vi.mocked(User.findAll).mock.calls[0][0]?.where).toEqual({ id: ['user-1', 'user-2'] })
  })

  test('rejects non-admins', async () => {
    currentUser = { id: 'user-1', isAdmin: false }

    const res = await api.fetch('/admin/api-users')

    expect(res.status).toBe(403)
    expect(ApiKey.findAll).not.toHaveBeenCalled()
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
    expect(UserChatInstanceUsage.update).toHaveBeenCalledWith({ usageCount: 0, weeklyModelUsage: {} }, { where: { chatInstanceId: 'ci-1' } })
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

describe('DELETE /admin/usage/:userId', () => {
  const tokens = { input: 5, cachedInput: 0, cacheWrite: 0, output: 5 }
  const userRow = () => ({ id: 'user-1', usage: 1234, weeklyModelUsage: { 'gpt-4o': tokens }, totalModelUsage: { 'gpt-4o': tokens }, save: vi.fn() })

  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = { id: 'admin-1', isAdmin: true }
  })

  test('resets the token usage and empties the weekly usage by model, keeping the total', async () => {
    const user = userRow()
    vi.mocked(User.findByPk).mockResolvedValue(user as any)

    const res = await api.fetch('/admin/usage/user-1', { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(user.usage).toBe(0)
    expect(user.weeklyModelUsage).toEqual({})
    expect(user.totalModelUsage).toEqual({ 'gpt-4o': tokens })
    expect(user.save).toHaveBeenCalled()
  })

  test('returns 404 for an unknown user', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(null)

    const res = await api.fetch('/admin/usage/nope', { method: 'DELETE' })

    expect(res.status).toBe(404)
  })

  test('rejects non-admins', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }

    const res = await api.fetch('/admin/usage/user-1', { method: 'DELETE' })

    expect(res.status).toBe(403)
    expect(User.findByPk).not.toHaveBeenCalled()
  })
})

describe('DELETE /admin/usage', () => {
  const updatedFields = (model: { update: unknown }) => vi.mocked(model.update as typeof User.update).mock.calls.flatMap(([values]) => Object.keys(values))

  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = { id: 'admin-1', isAdmin: true }
    vi.mocked(User.count).mockResolvedValue(12 as any)
    vi.mocked(UserChatInstanceUsage.count).mockResolvedValue(30 as any)
  })

  test('resets the weekly usage of all users and courses, keeping the totals', async () => {
    const res = await api.fetch('/admin/usage', { method: 'DELETE' })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ users: 12, courseUsages: 30 })

    expect(User.update).toHaveBeenCalledWith(expect.objectContaining({ usage: 0 }), expect.anything())
    expect(User.update).toHaveBeenCalledWith({ weeklyModelUsage: {} }, expect.anything())
    expect(UserChatInstanceUsage.update).toHaveBeenCalledWith({ usageCount: 0 }, expect.anything())
    expect(UserChatInstanceUsage.update).toHaveBeenCalledWith({ weeklyModelUsage: {} }, expect.anything())

    // Not filtered by user or course: every row with usage is reset.
    for (const [, options] of [...vi.mocked(User.update).mock.calls, ...vi.mocked(UserChatInstanceUsage.update).mock.calls]) {
      expect(JSON.stringify(options.where)).not.toMatch(/userId|chatInstanceId|"id"/)
    }

    // The old general total accumulates the weekly usage at reset; no total is emptied.
    expect(updatedFields(User)).not.toContain('totalModelUsage')
    expect(updatedFields(UserChatInstanceUsage)).not.toContain('totalModelUsage')
    expect(updatedFields(UserChatInstanceUsage)).not.toContain('totalUsageCount')
  })

  test('rejects non-admins', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }

    const res = await api.fetch('/admin/usage', { method: 'DELETE' })

    expect(res.status).toBe(403)
    expect(User.update).not.toHaveBeenCalled()
    expect(UserChatInstanceUsage.update).not.toHaveBeenCalled()
  })
})

describe('GET /admin/usage-comparison', () => {
  const ONGOING = { startDate: '2020-01-01', endDate: '2099-01-01' }
  const outputPrice = getModelPrice(PRICE_BASELINE_MODEL)!.output
  /** Weekly model usage that costs `euros` */
  const usageCosting = (euros: number) => ({ [PRICE_BASELINE_MODEL]: { input: 0, cachedInput: 0, cacheWrite: 0, output: (euros / outputPrice) * 1_000_000 } })

  const userRow = (id: string, usage: number, weeklyModelUsage: object, isPowerUser = false) => ({
    id,
    username: id,
    firstNames: 'F',
    lastName: 'L',
    isPowerUser,
    usage,
    weeklyModelUsage,
  })
  const membership = (userId: string, id: string, budgetBonusPercent: number | null) => ({
    userId,
    chatInstanceId: id,
    chatInstance: { id, courseId: `cur-${id}`, name: { en: id }, activityPeriod: ONGOING, activated: true, budgetBonusPercent },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = { id: 'admin-1', isAdmin: true }
    vi.mocked(User.findAll).mockResolvedValue([
      userRow('cheap', DEFAULT_TOKEN_LIMIT / 2, usageCosting(WEEKLY_BUDGET / 4)),
      userRow('bonus', DEFAULT_TOKEN_LIMIT, usageCosting(WEEKLY_BUDGET * 1.5)),
      userRow('over', 0, usageCosting(WEEKLY_BUDGET * 1.2), true),
    ] as any)
    vi.mocked(Enrolment.findAll).mockResolvedValue([membership('bonus', 'c1', 100)] as any)
    vi.mocked(Responsibility.findAll).mockResolvedValue([membership('bonus', 'c2', null)] as any)
  })

  test('compares the old token % with the new cost % per user, highest cost % first', async () => {
    const res = await api.fetch('/admin/usage-comparison')
    const { results, count }: UsageComparisonResponse = await res.json()

    expect(res.status).toBe(200)
    expect(count).toBe(3)
    expect(results.map((row) => row.userId)).toEqual(['over', 'bonus', 'cheap'])

    const [over, bonus, cheap] = results

    expect(cheap.tokenLimit).toBe(DEFAULT_TOKEN_LIMIT)
    expect(cheap.tokenPercent).toBeCloseTo(50)
    expect(cheap.cost).toBeCloseTo(WEEKLY_BUDGET / 4)
    expect(cheap.costPercent).toBeCloseTo(25)
    expect(cheap.budget).toEqual({ limit: WEEKLY_BUDGET, base: WEEKLY_BUDGET, bonuses: [] })

    // Two active courses: two token bonuses, but only the +100% course raises the budget.
    expect(bonus.tokenLimit).toBe(DEFAULT_TOKEN_LIMIT + 2 * COURSE_TOKEN_BONUS)
    expect(bonus.tokenPercent).toBeCloseTo((DEFAULT_TOKEN_LIMIT / (DEFAULT_TOKEN_LIMIT + 2 * COURSE_TOKEN_BONUS)) * 100)
    expect(bonus.budget.limit).toBeCloseTo(2 * WEEKLY_BUDGET)
    expect(bonus.budget.bonuses).toEqual([{ courseId: 'cur-c1', name: { en: 'c1' }, percent: 100 }])
    expect(bonus.costPercent).toBeCloseTo(75)

    // The power user multiplier raises the old limit only.
    expect(over.tokenLimit).toBe(DEFAULT_TOKEN_LIMIT * 10)
    expect(over.tokenPercent).toBe(0)
    expect(over.costPercent).toBeCloseTo(120)
  })

  test('looks up the memberships of all users at once', async () => {
    await api.fetch('/admin/usage-comparison')

    expect(Enrolment.findAll).toHaveBeenCalledTimes(1)
    expect(Responsibility.findAll).toHaveBeenCalledTimes(1)
    expect(vi.mocked(Enrolment.findAll).mock.calls[0][0]?.where).toEqual({ userId: ['cheap', 'bonus', 'over'] })
  })

  test('returns an empty list without usage this week', async () => {
    vi.mocked(User.findAll).mockResolvedValue([])

    const res = await api.fetch('/admin/usage-comparison')

    expect(await res.json()).toEqual({ results: [], count: 0 })
    expect(Enrolment.findAll).not.toHaveBeenCalled()
  })

  const userIds = async (query: string) => {
    const res = await api.fetch(`/admin/usage-comparison?${query}`)
    const { results, count }: UsageComparisonResponse = await res.json()
    return { ids: results.map((row) => row.userId), count }
  }

  test('sorts by the requested column and order', async () => {
    expect((await userIds('orderBy=costPercent&order=asc')).ids).toEqual(['cheap', 'bonus', 'over'])
    expect((await userIds('orderBy=tokenPercent&order=desc')).ids).toEqual(['cheap', 'bonus', 'over'])
  })

  test('returns the requested page and the count of all rows', async () => {
    expect(await userIds('limit=2')).toEqual({ ids: ['over', 'bonus'], count: 3 })
    expect(await userIds('limit=2&offset=2')).toEqual({ ids: ['cheap'], count: 3 })
  })

  test('falls back to the defaults on invalid params', async () => {
    expect(await userIds('orderBy=username&order=sideways&limit=abc&offset=-5')).toEqual({ ids: ['over', 'bonus', 'cheap'], count: 3 })
    expect((await userIds('limit=0')).ids).toEqual(['over'])
  })

  test('rejects non-admins', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }

    const res = await api.fetch('/admin/usage-comparison')

    expect(res.status).toBe(403)
    expect(User.findAll).not.toHaveBeenCalled()
  })
})
