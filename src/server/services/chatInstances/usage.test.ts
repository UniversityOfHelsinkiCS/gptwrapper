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

import { DEFAULT_TOKEN_LIMIT } from '../../../config'
import { ChatInstance, Enrolment, Responsibility, UserChatInstanceUsage } from '../../db/models'
import type { User as UserType } from '../../../shared/user'
import { setMembership } from '../../tests/membership'
import { COURSE_TOKEN_BONUS, getUserStatus, getUserTokenLimit } from './usage'

const ONGOING = { startDate: '2020-01-01', endDate: '2099-01-01' }
const EXPIRED = { startDate: '1744-01-01', endDate: '1818-12-31' }

const membership = (id: string, activityPeriod = ONGOING, activated = true) => ({
  chatInstanceId: id,
  chatInstance: { id, activityPeriod, activated },
})

const user = { id: 'u1', iamGroups: [], isAdmin: false, isPowerUser: false } as unknown as UserType

const mockMemberships = ({ enrolled = [], teached = [] }: { enrolled?: unknown[]; teached?: unknown[] }) => {
  vi.mocked(Enrolment.findAll).mockResolvedValue(enrolled as any)
  vi.mocked(Responsibility.findAll).mockResolvedValue(teached as any)
}

describe('getUserTokenLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('is the plain tier limit without any course memberships', async () => {
    mockMemberships({})

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT / 2)
  })

  test('grants the bonus for each ongoing course', async () => {
    mockMemberships({ enrolled: [membership('c1'), membership('c2')] })

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT / 2 + 2 * COURSE_TOKEN_BONUS)
  })

  test('counts taught courses alongside enrolled ones', async () => {
    mockMemberships({ enrolled: [membership('c1')], teached: [membership('c2')] })

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT / 2 + 2 * COURSE_TOKEN_BONUS)
  })

  test('counts a course the user both attends and teaches only once', async () => {
    mockMemberships({ enrolled: [membership('c1')], teached: [membership('c1')] })

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT / 2 + COURSE_TOKEN_BONUS)
  })

  test('ignores courses outside their activity period', async () => {
    mockMemberships({ enrolled: [membership('c1'), membership('c2', EXPIRED)] })

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT / 2 + COURSE_TOKEN_BONUS)
  })

  test('ignores courses the teacher has not activated', async () => {
    mockMemberships({ enrolled: [membership('c1'), membership('c2', ONGOING, false)] })

    expect(await getUserTokenLimit(user)).toBe(DEFAULT_TOKEN_LIMIT / 2 + COURSE_TOKEN_BONUS)
  })

  test('adds the bonus on top of the full access limit', async () => {
    mockMemberships({ enrolled: [membership('c1')] })

    expect(await getUserTokenLimit({ ...user, isAdmin: true })).toBe(DEFAULT_TOKEN_LIMIT + COURSE_TOKEN_BONUS)
  })

  test('adds the bonus on top of the power user limit', async () => {
    mockMemberships({ enrolled: [membership('c1')] })

    expect(await getUserTokenLimit({ ...user, isAdmin: true, isPowerUser: true })).toBe(DEFAULT_TOKEN_LIMIT * 10 + COURSE_TOKEN_BONUS)
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
