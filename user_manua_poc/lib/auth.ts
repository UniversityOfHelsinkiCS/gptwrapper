import type { BrowserContext } from '@playwright/test'

/**
 * Mirrors e2e/fixtures.ts (teacherTest): the app authenticates test users via
 * the x-test-user-* headers and seeds fresh test data (incl. the "Testikurssi"
 * test course) through /api/test/reset-test-data.
 *
 * Also accepts the terms-of-use disclaimer via the same API the UI uses
 * (POST /users/accept-terms, which sets User.termsAcceptedAt), so the
 * disclaimer modal never appears on screen and doesn't have to be part of
 * every recorded scenario.
 */
export async function setupTeacherSession(context: BrowserContext, workerIdx = 0) {
  await context.setExtraHTTPHeaders({
    'x-test-user-index': String(workerIdx),
    'x-test-user-role': 'teacher',
  })
  await context.request.post('/api/test/reset-test-data', {
    data: { testUserIdx: workerIdx, testUserRole: 'teacher' },
  })
  await context.request.post('/api/users/accept-terms')
}
