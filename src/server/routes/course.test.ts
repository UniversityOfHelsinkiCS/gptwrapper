// @vitest-environment node
import 'express-async-errors'
import express from 'express'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../db/models', () => ({
  Prompt: {},
  ChatInstance: { findOne: vi.fn() },
  RagIndex: {},
  Responsibility: { findOne: vi.fn() },
  PromptChatInstance: {},
  User: {},
  Discussion: {},
  Enrolment: { findOne: vi.fn() },
}))

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}))

vi.mock('../services/chatInstances/access', () => ({
  getEnrolledCourses: vi.fn(),
  getTeachedCourses: vi.fn(),
}))

import errorHandler from '../middleware/error'
import { ChatInstance, Enrolment, Responsibility } from '../db/models'
import courseRouter from './course'
import { getEnrolledCourses, getTeachedCourses } from '../services/chatInstances/access'

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
  app.use('/courses', courseRouter)
  app.use(errorHandler)

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve())
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Responsibility.findOne).mockResolvedValue(null)
  vi.mocked(Enrolment.findOne).mockResolvedValue(null)
  vi.mocked(ChatInstance.findOne).mockResolvedValue(null)
  currentUser = { id: 'student-1', isAdmin: false }
})

const getCourse = (id: string) => {
  return fetch(`${baseUrl}/courses/${id}`)
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

const getUserCourses = () => fetch(`${baseUrl}/courses/user`)

describe('courses/user', () => {
  test('returns one course if user is teacher AND enrolled', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }
    const course = courseFixture()
    vi.mocked(getTeachedCourses).mockResolvedValue([course] as any)
    vi.mocked(getEnrolledCourses).mockResolvedValue([{ chatInstance: course }] as any)

    const response = await getUserCourses()
    const body = await response.json()

    expect(body.length).toBe(1)
    expect(body[0].role).toBe('teacher')
  })
})
