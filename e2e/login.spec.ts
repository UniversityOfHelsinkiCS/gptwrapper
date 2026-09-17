import { expect, type APIRequestContext } from '@playwright/test'
import { TEST_COURSES } from '../src/shared/testData'
import { studentTest, teacherTest } from './fixtures'

const login = async (request: APIRequestContext, workerIndex: number, role: 'teacher' | 'student') => {
  const response = await request.get('/api/users/login', {
    headers: {
      'x-test-user-index': String(workerIndex),
      'x-test-user-role': role,
    },
  })
  expect(response.ok()).toBe(true)
  return response.json()
}

const getUserCourses = async (request: APIRequestContext, workerIndex: number, role: 'teacher' | 'student') => {
  const response = await request.get('/api/courses/user', {
    headers: {
      'x-test-user-index': String(workerIndex),
      'x-test-user-role': role,
    },
  })
  expect(response.ok()).toBe(true)
  return response.json()
}

const sandboxCourseIds = Object.values(TEST_COURSES).map((course) => course.courseId)

// TODO:
// this should be accessLevel === 'FULL' soon
const ownCourseIds = (courses) => courses.filter((course) => course.role === 'teacher').map((course) => course.courseId)

teacherTest.describe('Login sandbox access', () => {
  teacherTest('grants every sandbox course on first login', async ({ request }, testInfo) => {
    await login(request, testInfo.workerIndex, 'teacher')
    const courses = await getUserCourses(request, testInfo.workerIndex, 'teacher')

    expect(ownCourseIds(courses).sort()).toEqual([...sandboxCourseIds].sort())
  })

  teacherTest('is idempotent across repeated logins', async ({ request }, testInfo) => {
    const first = await getUserCourses(request, testInfo.workerIndex, 'teacher')
    const second = await getUserCourses(request, testInfo.workerIndex, 'teacher')
    const third = await getUserCourses(request, testInfo.workerIndex, 'teacher')

    const firstOwnCourses = ownCourseIds(first)
    const secondOwnCourses = ownCourseIds(second)
    const thirdOwnCourses = ownCourseIds(third)

    expect(secondOwnCourses.sort()).toEqual(firstOwnCourses.sort())
    expect(thirdOwnCourses.sort()).toEqual(firstOwnCourses.sort())
  })
})

studentTest.describe('Login sandbox access', () => {
  studentTest('does not grant sandbox courses to a plain student', async ({ request }, testInfo) => {
    await login(request, testInfo.workerIndex, 'teacher')
    const courses = await getUserCourses(request, testInfo.workerIndex, 'student')

    // A student is in neither demo IAM group, so both functions early-return the
    // plain query result. Only the enrolment reset-test-data created should be there.
    // EXAMPLE_COURSE ended in 2024 so it shouldnt be here either.
    expect(ownCourseIds(courses)).toEqual([])
    expect(courses.map((course) => course.courseId)).toEqual([TEST_COURSES.TEST_COURSE.courseId])
  })
})
