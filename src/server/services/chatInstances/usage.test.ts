// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../../db/models', () => ({
  ChatInstance: { findOne: vi.fn() },
  Enrolment: { findAll: vi.fn(), findOne: vi.fn() },
  Prompt: {},
  RagIndex: {},
  Responsibility: { findAll: vi.fn(), findOne: vi.fn() },
  User: {},
  UserChatInstanceUsage: { findOrCreate: vi.fn() },
}))

vi.mock('../../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { DEFAULT_TOKEN_LIMIT, WEEKLY_BUDGET } from '../../../config'
import { ChatInstance, Enrolment, Responsibility, UserChatInstanceUsage } from '../../db/models'
import type { User as UserType } from '../../../shared/user'
import { setMembership } from '../../tests/membership'
import { checkUsage, COURSE_TOKEN_BONUS, getActiveCourseMembershipsByUser, getUserBudget, getUserStatus, getUserTokenLimit } from './usage'

const ONGOING = { startDate: '2020-01-01', endDate: '2099-01-01' }
const EXPIRED = { startDate: '1744-01-01', endDate: '1818-12-31' }

const membership = (id: string, activityPeriod = ONGOING, activated = true, userId = 'u1') => ({
  userId,
  chatInstanceId: id,
  chatInstance: { id, activityPeriod, activated },
})

const user = { id: 'u1', iamGroups: [], isAdmin: false, isPowerUser: false } as unknown as UserType

const mockMemberships = ({ enrolled = [], teached = [] }: { enrolled?: unknown[]; teached?: unknown[] }) => {
  vi.mocked(Enrolment.findAll).mockResolvedValue(enrolled as any)
  vi.mocked(Responsibility.findAll).mockResolvedValue(teached as any)
}

// Free models are unlimited in chat (v3 skips checkUsage for them), but the
// external API caps them with checkUsage, so it must not exempt any model.
describe('checkUsage', () => {
  test('blocks usage at the limit regardless of model', () => {
    expect(checkUsage(user, 999, 1000)).toBe(true)
    expect(checkUsage(user, 1000, 1000)).toBe(false)
  })

  test('admins are never blocked', () => {
    expect(checkUsage({ ...user, isAdmin: true }, 5000, 1000)).toBe(true)
  })
})

describe('getUserTokenLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('is the plain tier limit without any course memberships', async () => {
    mockMemberships({})

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT)
  })

  test('grants the bonus for each ongoing course', async () => {
    mockMemberships({ enrolled: [membership('c1'), membership('c2')] })

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT + 2 * COURSE_TOKEN_BONUS)
  })

  test('counts taught courses alongside enrolled ones', async () => {
    mockMemberships({ enrolled: [membership('c1')], teached: [membership('c2')] })

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT + 2 * COURSE_TOKEN_BONUS)
  })

  test('counts a course the user both attends and teaches only once', async () => {
    mockMemberships({ enrolled: [membership('c1')], teached: [membership('c1')] })

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT + COURSE_TOKEN_BONUS)
  })

  test('ignores courses outside their activity period', async () => {
    mockMemberships({ enrolled: [membership('c1'), membership('c2', EXPIRED)] })

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT + COURSE_TOKEN_BONUS)
  })

  test('ignores courses the teacher has not activated', async () => {
    mockMemberships({ enrolled: [membership('c1'), membership('c2', ONGOING, false)] })

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT + COURSE_TOKEN_BONUS)
  })

  test('gives users with IAM access the same base limit as students', async () => {
    mockMemberships({})

    expect(await getUserTokenLimit({ ...user, isAdmin: true })).toBe(DEFAULT_TOKEN_LIMIT)
  })

  test('adds the bonus on top of the power user limit', async () => {
    mockMemberships({ enrolled: [membership('c1')] })

    expect(await getUserTokenLimit({ ...user, isPowerUser: true })).toBe(DEFAULT_TOKEN_LIMIT * 10 + COURSE_TOKEN_BONUS)
  })
})

describe('getUserBudget', () => {
  const course = (id: string, budgetBonusPercent: number | null, activityPeriod = ONGOING, activated = true) => ({
    userId: 'u1',
    chatInstanceId: id,
    chatInstance: { id, courseId: `cur-${id}`, name: { en: id }, activityPeriod, activated, budgetBonusPercent },
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('is the base budget without any courses', async () => {
    mockMemberships({})

    expect(await getUserBudget(user)).toEqual({ limit: WEEKLY_BUDGET, base: WEEKLY_BUDGET, bonuses: [] })
  })

  test('adds up the bonuses: two +100% courses give 3× the base', async () => {
    mockMemberships({ enrolled: [course('c1', 100)], teached: [course('c2', 100)] })

    const budget = await getUserBudget(user)

    expect(budget.limit).toBeCloseTo(3 * WEEKLY_BUDGET)
    expect(budget.base).toBe(WEEKLY_BUDGET)
    expect(budget.bonuses).toEqual([
      { courseId: 'cur-c1', name: { en: 'c1' }, percent: 100 },
      { courseId: 'cur-c2', name: { en: 'c2' }, percent: 100 },
    ])
  })

  test('ignores inactive, out-of-period and null-bonus courses', async () => {
    mockMemberships({
      enrolled: [course('c1', 50), course('expired', 100, EXPIRED), course('not-activated', 100, ONGOING, false), course('no-bonus', null)],
      teached: [course('not-started', 100, { startDate: '2098-01-01', endDate: '2099-01-01' })],
    })

    const budget = await getUserBudget(user)

    expect(budget.limit).toBeCloseTo(1.5 * WEEKLY_BUDGET)
    expect(budget.bonuses.map((bonus) => bonus.courseId)).toEqual(['cur-c1'])
  })

  test('counts a course the user both attends and teaches only once', async () => {
    mockMemberships({ enrolled: [course('c1', 100)], teached: [course('c1', 100)] })

    const budget = await getUserBudget(user)

    expect(budget.limit).toBeCloseTo(2 * WEEKLY_BUDGET)
    expect(budget.bonuses).toHaveLength(1)
  })

  test('has no power user multiplier', async () => {
    mockMemberships({ enrolled: [course('c1', 100)] })

    expect((await getUserBudget({ ...user, isPowerUser: true })).limit).toBeCloseTo(2 * WEEKLY_BUDGET)
  })

  test('a zero bonus is listed but does not raise the limit', async () => {
    mockMemberships({ enrolled: [course('c1', 0)] })

    const budget = await getUserBudget(user)

    expect(budget.limit).toBe(WEEKLY_BUDGET)
    expect(budget.bonuses).toHaveLength(1)
  })
})

describe('getActiveCourseMembershipsByUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const courseIds = (byUser: Map<string, { id: string }[]>, userId: string) => byUser.get(userId)?.map((course) => course.id)

  test('looks up the memberships of all users with one enrolment and one responsibility query', async () => {
    mockMemberships({
      enrolled: [membership('c1', ONGOING, true, 'u1'), membership('c2', ONGOING, true, 'u2'), membership('c1', ONGOING, true, 'u2')],
      teached: [membership('c3', ONGOING, true, 'u1')],
    })

    const byUser = await getActiveCourseMembershipsByUser(['u1', 'u2', 'u3'])

    expect(Enrolment.findAll).toHaveBeenCalledTimes(1)
    expect(Responsibility.findAll).toHaveBeenCalledTimes(1)
    expect(vi.mocked(Enrolment.findAll).mock.calls[0][0]?.where).toEqual({ userId: ['u1', 'u2', 'u3'] })
    expect(courseIds(byUser, 'u1')).toEqual(['c1', 'c3'])
    expect(courseIds(byUser, 'u2')).toEqual(['c2', 'c1'])
    expect(byUser.has('u3')).toBe(false)
  })

  test('counts a course once per user and leaves out inactive courses', async () => {
    mockMemberships({
      enrolled: [membership('c1', ONGOING, true, 'u1'), membership('expired', EXPIRED, true, 'u1'), membership('c1', ONGOING, true, 'u2')],
      teached: [membership('c1', ONGOING, true, 'u1'), membership('off', ONGOING, false, 'u2')],
    })

    const byUser = await getActiveCourseMembershipsByUser(['u1', 'u2'])

    expect(courseIds(byUser, 'u1')).toEqual(['c1'])
    expect(courseIds(byUser, 'u2')).toEqual(['c1'])
  })

  test('makes no queries without users', async () => {
    expect((await getActiveCourseMembershipsByUser([])).size).toBe(0)
    expect(Enrolment.findAll).not.toHaveBeenCalled()
  })
})

describe('getUserStatus', () => {
  const chatInstance = (activityPeriod = ONGOING, activated = true) => ({ id: 'ci-1', courseId: 'course-1', usageLimit: 1000, activityPeriod, activated })

  beforeEach(() => {
    vi.clearAllMocks()
    setMembership({})
    vi.mocked(ChatInstance.findOne).mockResolvedValue(chatInstance() as any)
    vi.mocked(UserChatInstanceUsage.findOrCreate).mockResolvedValue([{ usageCount: 300 }, false] as any)
  })

  test('admin gets the usage and the limit', async () => {
    expect(await getUserStatus({ ...user, isAdmin: true }, 'course-1')).toEqual({ usage: 300, limit: 1000 })
  })

  test('responsible teacher gets the usage and the limit', async () => {
    setMembership({ responsible: true })
    expect(await getUserStatus(user, 'course-1')).toEqual({ usage: 300, limit: 1000 })
  })

  test('enrolled student gets the usage and the limit', async () => {
    setMembership({ enrolled: true })
    expect(await getUserStatus(user, 'course-1')).toEqual({ usage: 300, limit: 1000 })
  })

  test('enrolled student on a closed course still gets the usage and the limit', async () => {
    setMembership({ enrolled: true })
    vi.mocked(ChatInstance.findOne).mockResolvedValue(chatInstance(EXPIRED) as any)
    expect(await getUserStatus(user, 'course-1')).toEqual({ usage: 300, limit: 1000 })
  })

  test('a course that is not activated gets the default limit', async () => {
    setMembership({ enrolled: true })
    vi.mocked(ChatInstance.findOne).mockResolvedValue(chatInstance(ONGOING, false) as any)
    expect(await getUserStatus(user, 'course-1')).toEqual({ usage: 300, limit: DEFAULT_TOKEN_LIMIT })
  })

  test('outsider gets zero usage and zero limit, and no usage row is created', async () => {
    expect(await getUserStatus(user, 'course-1')).toEqual({ usage: 0, limit: 0 })
    expect(UserChatInstanceUsage.findOrCreate).not.toHaveBeenCalled()
  })
})
