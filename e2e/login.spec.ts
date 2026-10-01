import { expect, type APIRequestContext } from '@playwright/test'
import { STAFF_COURSES, TEST_COURSES } from '../src/shared/testData'
import { adminTest, studentTest } from './fixtures'

const login = async (request: APIRequestContext, workerIndex: number, role: 'teacher' | 'student' | 'admin') => {
  const response = await request.get('/api/users/login', {
    headers: {
      'x-test-user-index': String(workerIndex),
      'x-test-user-role': role,
    },
  })
  expect(response.ok()).toBe(true)
  return response.json()
}

const getUserCourses = async (request: APIRequestContext, workerIndex: number, role: 'teacher' | 'student' | 'admin') => {
  const response = await request.get('/api/courses/user', {
    headers: {
      'x-test-user-index': String(workerIndex),
      'x-test-user-role': role,
    },
  })
  expect(response.ok()).toBe(true)
  return response.json()
}

const sandboxCourseIds = Object.values(STAFF_COURSES).map((course) => course.courseId)

// TODO:
// this should be accessLevel === 'FULL' soon
const ownCourseIds = (courses) => courses.filter((course) => course.role === 'teacher').map((course) => course.courseId)

adminTest.describe('Login sandbox access', () => {
  adminTest('grants every sandbox course on first login', async ({ request }, testInfo) => {
    await login(request, testInfo.workerIndex, 'admin')
    const courses = await getUserCourses(request, testInfo.workerIndex, 'admin')

    expect(ownCourseIds(courses)).toEqual(expect.arrayContaining(sandboxCourseIds))
  })

  adminTest('is idempotent across repeated logins', async ({ request }, testInfo) => {
    const idx = testInfo.workerIndex

    await login(request, idx, 'admin')
    const first = ownCourseIds(await getUserCourses(request, idx, 'admin')).sort()
    await login(request, idx, 'admin')
    await login(request, idx, 'admin')
    const second = ownCourseIds(await getUserCourses(request, idx, 'admin')).sort()

    expect(second).toEqual(first)
  })
})

studentTest.describe('Login sandbox access', () => {
  studentTest('does not grant sandbox courses to a plain student', async ({ request }, testInfo) => {
    await login(request, testInfo.workerIndex, 'student')
    const courses = await getUserCourses(request, testInfo.workerIndex, 'student')

    // A student is not an admin or in grp-toska
    expect(ownCourseIds(courses)).toEqual([])
    expect(courses.map((course) => course.courseId)).toEqual([TEST_COURSES.TEST_COURSE.courseId])
  })
})
