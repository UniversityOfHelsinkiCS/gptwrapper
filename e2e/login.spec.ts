import { expect, type APIRequestContext } from '@playwright/test'
import { TEST_COURSES } from '../src/shared/testData'
import { studentTest, teacherTest } from './fixtures'

/**
 * `getEnrolledCourses` / `getTeachedCourses` only upsert the sandbox enrolments and
 * responsibilities that are actually missing, and re-fetch afterwards. These tests pin
 * the resulting behaviour: the first login after a reset creates them, and every login
 * after that returns the same set without duplicating rows.
 */

// In dev/CI the user middleware rebuilds the user purely from these two headers.
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

const sandboxCourseIds = Object.values(TEST_COURSES).map((course) => course.courseId)

teacherTest.describe('Login sandbox access', () => {
  teacherTest('grants every sandbox course on first login', async ({ request }, testInfo) => {
    const user = await login(request, testInfo.workerIndex, 'teacher')

    // ownCourses is derived from Responsibility rows, which reset-test-data wiped.
    expect(user.ownCourses.sort()).toEqual([...sandboxCourseIds].sort())
  })

  teacherTest('is idempotent across repeated logins', async ({ request }, testInfo) => {
    const first = await login(request, testInfo.workerIndex, 'teacher')
    const second = await login(request, testInfo.workerIndex, 'teacher')
    const third = await login(request, testInfo.workerIndex, 'teacher')

    // The second and third logins take the "nothing missing, skip the upserts" path.
    // They must still return the same courses, and must not duplicate rows.
    expect(second.ownCourses.sort()).toEqual(first.ownCourses.sort())
    expect(third.ownCourses.sort()).toEqual(first.ownCourses.sort())

    // One Responsibility row per course: repeated logins must not accumulate more.
    expect(new Set(third.ownCourses).size).toBe(third.ownCourses.length)

    // The sandbox enrolment (as opposed to responsibility) is upserted separately.
    expect(third.activeCourseIds).toContain(TEST_COURSES.OTE_SANDBOX.courseId)

    // activeCourseIds concats enrolled + taught without deduping, so a teacher sees
    // 'sandbox' twice. Pre-existing; asserted here so the count is pinned either way.
    expect(third.activeCourseIds.length).toBe(first.activeCourseIds.length)
  })
})

studentTest.describe('Login sandbox access', () => {
  studentTest('does not grant sandbox courses to a plain student', async ({ request }, testInfo) => {
    const user = await login(request, testInfo.workerIndex, 'student')

    // A student is in neither demo IAM group, so both functions early-return the
    // plain query result. Only the enrolment reset-test-data created should be there.
    expect(user.ownCourses).toEqual([])
    expect(user.activeCourseIds).toEqual([TEST_COURSES.TEST_COURSE.courseId])
  })
})
