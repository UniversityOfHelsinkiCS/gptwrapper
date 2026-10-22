// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { startTestServer } from '../../tests/testServer'
import { setMembership } from '../../tests/membership'

vi.mock('../../db/models', () => ({
  ChatInstance: { findByPk: vi.fn() },
  Enrolment: { findOne: vi.fn() },
  Prompt: {},
  RagFile: { count: vi.fn() },
  RagIndex: { findAll: vi.fn() },
  Responsibility: { findOne: vi.fn() },
  User: {},
}))

vi.mock('./ragIndex', async () => ({ default: (await import('express')).Router() }))
vi.mock('./ragIndexMiddleware', () => ({ ragIndexMiddleware: vi.fn() }))
vi.mock('../../services/rag/vectorStore', () => ({ RedisVectorStore: {} }))

vi.mock('../../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}))

import ragRouter from './rag'
import { ChatInstance } from '../../db/models'

let currentUser: { id: string; isAdmin: boolean }

const api = startTestServer('/rag', ragRouter, () => currentUser)

const open = { activityPeriod: { startDate: '2026-01-01', endDate: '2062-12-31' }, activated: true }
const expired = { activityPeriod: { startDate: '2020-01-01', endDate: '2020-06-01' }, activated: true }

const ragIndexFixture = () => ({ id: 1, metadata: { name: 'Lecture notes' } })

const chatInstanceFixture = (overrides = {}) => ({
  id: 'ci-1',
  courseId: 'course-1',
  ragIndices: [ragIndexFixture()],
  ...open,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'student-1', isAdmin: false }
  setMembership({})
  vi.mocked(ChatInstance.findByPk).mockResolvedValue(chatInstanceFixture() as any)
})

const getCourseIndices = () => api.fetch(`/rag/indices?chatInstanceId=ci-1&includeExtras=false`)

describe('GET /rag/indices?chatInstanceId=', () => {
  test('responsible teacher gets the indices', async () => {
    currentUser = { id: 'teacher-1', isAdmin: false }
    setMembership({ responsible: true })
    const response = await getCourseIndices()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual([ragIndexFixture()])
  })

  test('enrolled student gets the indices', async () => {
    setMembership({ enrolled: true })
    const response = await getCourseIndices()
    expect(response.status).toBe(200)
  })

  // Decided in issue 17: any access level may read the legacy course materials, a closed course included.
  test('enrolled student on a closed course still gets the indices', async () => {
    setMembership({ enrolled: true })
    vi.mocked(ChatInstance.findByPk).mockResolvedValue(chatInstanceFixture(expired) as any)
    const response = await getCourseIndices()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual([ragIndexFixture()])
  })

  test('outsider gets 403', async () => {
    currentUser = { id: 'outsider-1', isAdmin: false }
    const response = await getCourseIndices()
    expect(response.status).toBe(403)
  })
})
