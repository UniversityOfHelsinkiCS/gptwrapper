import { expect } from '@playwright/test'
import { studentTest as test } from './fixtures'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'

test.describe('Saved discussions', () => {
  test('student chat in a saving course is visible to the teacher', async ({ page, request }, testInfo) => {
    const workerIdx = testInfo.workerIndex
    const coursePath = `/discussion-test-course-${workerIdx}`

    // Per-worker course (+ enrolment, teacher responsibility, clean slate) so parallel
    // workers and retries never share discussion rows.
    await request.post('/api/test/setup-discussion-test', { data: { testUserIdx: workerIdx } })

    const message = `saved-discussion-${workerIdx}-${Date.now()}`

    // --- Act as the student: chat in the saving course ---
    await page.goto(coursePath)
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

    // --- Verify the saved discussion in the teacher's Discussions view ---
    // The teacher's terms are pre-accepted in setup, so no disclaimer modal appears.
    await page.goto(`${coursePath}/course/discussions`)

    const discusserRow = page.getByTestId('discusser-row')
    await expect(discusserRow).toHaveCount(1)

    await page.getByTestId('discusser-link').first().click()

    await expect(page.getByTestId('discussion-user-message')).toContainText(message)
  })
})
