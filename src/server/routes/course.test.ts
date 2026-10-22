// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { startTestServer } from '../tests/testServer'
import { setMembership } from '../tests/membership'

vi.mock('../db/models', () => ({
  Prompt: {},
  ChatInstance: { findOne: vi.fn() },
  RagIndex: {},
  Responsibility: { findOne: vi.fn() },
  PromptChatInstance: {},
  User: {},
  Discussion: { findAll: vi.fn() },
  Enrolment: { findOne: vi.fn() },
}))

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}))

vi.mock('../services/chatInstances/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/chatInstances/access')>()), // keep functions real
  getEnrolledCourses: vi.fn(), // except these two
  getTeachedCourses: vi.fn(),
}))

import { ChatInstance, Discussion, Enrolment, Responsibility } from '../db/models'
import courseRouter from './course'
import { getEnrolledCourses, getTeachedCourses } from '../services/chatInstances/access'

let currentUser: { id: string; isAdmin: boolean }

const api = startTestServer('/courses', courseRouter, () => currentUser)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Responsibility.findOne).mockResolvedValue(null)
  vi.mocked(Enrolment.findOne).mockResolvedValue(null)
  vi.mocked(ChatInstance.findOne).mockResolvedValue(null)
  currentUser = { id: 'student-1', isAdmin: false }
})

const getCourse = (id: string) => {
  return api.fetch(`/courses/${id}`)
}

const courseFixture = (overrides = {}) => ({
  id: 'ci-1',
  courseId: 'course-1',
  activityPeriod: { startDate: '2026-01-01', endDate: '2062-12-31' },
  activated: true,
  prompts: [{ id: 'prompt-1', systemMessage: 'very secret draft' }],
  responsibilities: [],
  ...overrides,
  toJSON() {
    return { ...this }
  },
})

const expired = { activityPeriod: { startDate: '2020-01-01', endDate: '2020-06-01' } }
const notStarted = { activityPeriod: { startDate: '2099-01-01', endDate: '2099-06-01' } }

describe('courses/:id', () => {
  describe('Admin', () => {
    test('gets 200 with prompts on a not activated course', async () => {
      currentUser = { id: 'admin-1', isAdmin: true }
      vi.mocked(ChatInstance.findOne).mockResolvedValue(courseFixture({ activated: false }) as any)
      const response = await getCourse('course-1')
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.prompts).toHaveLength(1)
      expect(body.status).toBe('NOT_ACTIVATED')
      expect(body.accessLevel).toBe('FULL')
    })
  })

  describe('Responsible teacher', () => {
    test('gets 200 with prompts on a not activated course', async () => {
      currentUser = { id: 'teacher-1', isAdmin: false }
      vi.mocked(ChatInstance.findOne).mockResolvedValue(courseFixture({ activated: false }) as any)
      vi.mocked(Responsibility.findOne).mockResolvedValue({ id: 'responsibility-1' } as any)
      const response = await getCourse('course-1')
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.prompts).toHaveLength(1)
      expect(body.status).toBe('NOT_ACTIVATED')
      expect(body.accessLevel).toBe('FULL')
    })

    test('gets 200 with prompts on an expired course', async () => {
      currentUser = { id: 'teacher-1', isAdmin: false }
      vi.mocked(ChatInstance.findOne).mockResolvedValue(courseFixture(expired) as any)
      vi.mocked(Responsibility.findOne).mockResolvedValue({ id: 'responsibility-1' } as any)
      const response = await getCourse('course-1')
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.prompts).toHaveLength(1)
      expect(body.status).toBe('EXPIRED')
      expect(body.accessLevel).toBe('FULL')
    })
  })

  describe('Enrolled student', () => {
    test('gets 200 with prompts on an open course', async () => {
      currentUser = { id: 'student-1', isAdmin: false }
      vi.mocked(ChatInstance.findOne).mockResolvedValue(courseFixture({ activated: true }) as any)
      vi.mocked(Enrolment.findOne).mockResolvedValue(courseFixture({ id: 'student-1' }) as any)
      const response = await getCourse('course-1')
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.prompts).toHaveLength(1)
      expect(body.status).toBe('ACTIVATED')
      expect(body.accessLevel).toBe('STUDENT')
    })

    test('gets 200 with no prompts on a not activated course', async () => {
      currentUser = { id: 'student-1', isAdmin: false }
      vi.mocked(ChatInstance.findOne).mockResolvedValue(courseFixture({ activated: false }) as any)
      vi.mocked(Enrolment.findOne).mockResolvedValue(courseFixture({ id: 'enrolment-1' }) as any)
      const response = await getCourse('course-1')
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.prompts).toEqual([])
      expect(JSON.stringify(body)).not.toContain('very secret draft')
      expect(body.status).toBe('NOT_ACTIVATED')
      expect(body.accessLevel).toBe('STUDENT_CLOSED')
    })

    test('gets 200 with no prompts on an expired course', async () => {
      currentUser = { id: 'student-1', isAdmin: false }
      vi.mocked(ChatInstance.findOne).mockResolvedValue(courseFixture(expired) as any)
      vi.mocked(Enrolment.findOne).mockResolvedValue(courseFixture({ id: 'enrolment-1' }) as any)
      const response = await getCourse('course-1')
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.prompts).toEqual([])
      expect(JSON.stringify(body)).not.toContain('very secret draft')
      expect(body.status).toBe('EXPIRED')
      expect(body.accessLevel).toBe('STUDENT_CLOSED')
    })
    test('gets 200 with no prompts on an course that has not yet started', async () => {
      currentUser = { id: 'student-1', isAdmin: false }
      vi.mocked(ChatInstance.findOne).mockResolvedValue(courseFixture(notStarted) as any)
      vi.mocked(Enrolment.findOne).mockResolvedValue(courseFixture({ id: 'enrolment-1' }) as any)
      const response = await getCourse('course-1')
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.prompts).toEqual([])
      expect(JSON.stringify(body)).not.toContain('very secret draft')
      expect(body.status).toBe('NOT_STARTED')
      expect(body.accessLevel).toBe('STUDENT_CLOSED')
    })
  })

  describe('Outsider', () => {
    test('gets 403 for open course', async () => {
      currentUser = { id: 'outsider-1', isAdmin: false }
      vi.mocked(ChatInstance.findOne).mockResolvedValue(courseFixture({ activated: true }) as any)
      const response = await getCourse('course-1')
      expect(response.status).toBe(403)
    })
  })
})

const getUserCourses = () => api.fetch(`/courses/user`)

describe('courses/user', () => {
  test('returns one course if user is teacher AND enrolled', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }
    const course = courseFixture()
    vi.mocked(getTeachedCourses).mockResolvedValue([course] as any)
    vi.mocked(getEnrolledCourses).mockResolvedValue([{ chatInstance: course }] as any)

    const response = await getUserCourses()
    const body = await response.json()

    expect(body.length).toBe(1)
    expect(body[0].accessLevel).toBe('FULL')
    expect(body[0].status).toBe('ACTIVATED')
    expect(body[0].role).toBeUndefined()
  })

  test('sends an enrolled course as STUDENT with its status', async () => {
    vi.mocked(getTeachedCourses).mockResolvedValue([] as any)
    vi.mocked(getEnrolledCourses).mockResolvedValue([{ chatInstance: courseFixture() }] as any)

    const body = await (await getUserCourses()).json()

    expect(body).toHaveLength(1)
    expect(body[0].accessLevel).toBe('STUDENT')
    expect(body[0].status).toBe('ACTIVATED')
  })

  test('sends an enrolled course as FULL to an admin', async () => {
    currentUser = { id: 'admin-1', isAdmin: true }
    vi.mocked(getTeachedCourses).mockResolvedValue([] as any)
    vi.mocked(getEnrolledCourses).mockResolvedValue([{ chatInstance: courseFixture() }] as any)

    const body = await (await getUserCourses()).json()

    expect(body[0].accessLevel).toBe('FULL')
  })

  test('sends the status of a taught course that is not activated or not started', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }
    vi.mocked(getTeachedCourses).mockResolvedValue([courseFixture({ id: 'ci-off', activated: false }), courseFixture({ id: 'ci-later', ...notStarted })] as any)
    vi.mocked(getEnrolledCourses).mockResolvedValue([] as any)

    const body = await (await getUserCourses()).json()

    expect(body.map((course: { status: string }) => course.status)).toEqual(['NOT_ACTIVATED', 'NOT_STARTED'])
  })

  test('skips a taught course with a broken activityPeriod', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }
    vi.mocked(getTeachedCourses).mockResolvedValue([courseFixture({ id: 'ci-bad', activityPeriod: null }), courseFixture({ id: 'ci-good' })] as any)
    vi.mocked(getEnrolledCourses).mockResolvedValue([] as any)

    const response = await getUserCourses()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('ci-good')
  })

  test('handles broken activityPeriod', async () => {
    vi.mocked(getTeachedCourses).mockResolvedValue([] as any)
    vi.mocked(getEnrolledCourses).mockResolvedValue([
      { chatInstance: courseFixture({ id: 'ci-bad', activityPeriod: null }) },
      { chatInstance: courseFixture({ id: 'ci-good' }) },
    ] as any)
    const response = await getUserCourses()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.length).toBe(1)
    expect(body[0].id).toBe('ci-good')
  })
})

/** One case per access level: admin, teacher, student, student on a closed course, and a user with no row. */
const accessCases = [
  { who: 'admin', user: { id: 'admin-1', isAdmin: true }, membership: {}, course: {}, status: 200 },
  { who: 'responsible teacher', user: { id: 'teacher-1', isAdmin: false }, membership: { responsible: true }, course: {}, status: 200 },
  { who: 'enrolled student', user: { id: 'student-1', isAdmin: false }, membership: { enrolled: true }, course: {}, status: 403 },
  { who: 'enrolled student on a closed course', user: { id: 'student-1', isAdmin: false }, membership: { enrolled: true }, course: expired, status: 403 },
  { who: 'outsider', user: { id: 'outsider-1', isAdmin: false }, membership: {}, course: {}, status: 403 },
]

describe('courses/:id/enrolments (enforceUserHasFullAccess)', () => {
  test.each(accessCases)('$who gets $status', async ({ user, membership, course, status }) => {
    currentUser = user
    setMembership(membership)
    vi.mocked(ChatInstance.findOne).mockResolvedValue(courseFixture({ ...course, enrolments: [] }) as any)
    const response = await api.fetch('/courses/course-1/enrolments')
    expect(response.status).toBe(status)
  })
})

describe('courses/:id/discussions', () => {
  beforeEach(() => {
    vi.mocked(Discussion.findAll).mockResolvedValue([])
  })

  test.each(accessCases)('$who gets $status', async ({ user, membership, course, status }) => {
    currentUser = user
    setMembership(membership)
    vi.mocked(ChatInstance.findOne).mockResolvedValue(courseFixture(course) as any)
    const response = await api.fetch('/courses/course-1/discussions')
    expect(response.status).toBe(status)
  })

  test('404 when the course does not exist', async () => {
    currentUser = { id: 'admin-1', isAdmin: true }
    const response = await api.fetch('/courses/course-1/discussions')
    expect(response.status).toBe(404)
  })
})
