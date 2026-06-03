import { expect } from '@playwright/test'
import { studentTest as test } from './fixtures'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'

const COURSE_PATH = '/discussion-test-course-id'

test.describe('Saved discussions', () => {
  test('student chat in a saving course is visible to the teacher', async ({ page, request }, testInfo) => {
    const workerIdx = testInfo.workerIndex

    // The student fixture already provisioned the student + enrolments.
    // Provision the teacher user too so getTeachedCourses can grant the responsibility.
    await request.post('/api/test/reset-test-data', { data: { testUserIdx: workerIdx, testUserRole: 'teacher' } })

    // This is the only test that writes to the discussion course. Wipe it so the
    // discussers assertion is deterministic regardless of prior worker indices / retries.
    await request.post('/api/test/reset-course-discussions', { data: { courseId: 'discussion-test-course-id' } })

    const message = `saved-discussion-${workerIdx}-${Date.now()}`

    // --- Act as the student: chat in the saving course ---
    await page.goto(COURSE_PATH)
    await acceptDisclaimer(page)
    await useMockModel(page)

    const streamResponse = page.waitForResponse((r) => r.url().includes('/stream') && r.status() === 200)
    await sendChatMessage(page, message)
    await closeSendPreference(page)
    // The 200 arrives with the response headers, but the discussion is only persisted
    // server-side right before res.end(). Wait for the body to fully finish so the
    // Discussion row is committed before we read it as the teacher.
    await (await streamResponse).finished()

    await expect(page.getByTestId('assistant-message')).toContainText('You are calling mock endpoint for streaming mock data')

    // --- Switch role to teacher (auth is header-only) ---
    await page.context().setExtraHTTPHeaders({
      'x-test-user-index': String(workerIdx),
      'x-test-user-role': 'teacher',
    })

    // Navigating to the course triggers getTeachedCourses, which upserts the teacher's responsibility.
    await page.goto(COURSE_PATH)
    await acceptDisclaimer(page)

    // --- Verify the saved discussion in the teacher's Discussions view ---
    await page.goto(`${COURSE_PATH}/course/discussions`)

    const discusserRow = page.getByTestId('discusser-row')
    await expect(discusserRow).toHaveCount(1)

    await page.getByTestId('discusser-link').first().click()

    await expect(page.getByTestId('discussion-user-message')).toContainText(message)
  })
})
