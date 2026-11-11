import { test as base, type Page } from '@playwright/test'
import { setupLogging } from './utils/logging'

/**
 * Picks the worker's test user for every request of the page. Browsers send no extra headers on a WebSocket
 * upgrade, so the same values go in cookies too, which the chat socket reads in dev and CI.
 */
const setTestUser = async (page: Page, baseURL: string | undefined, testUserIdx: number, testUserRole: string) => {
  await page.context().setExtraHTTPHeaders({
    'x-test-user-index': String(testUserIdx),
    'x-test-user-role': testUserRole,
  })
  const url = baseURL ?? 'http://localhost:3000'
  await page.context().addCookies([
    { name: 'x-test-user-index', value: String(testUserIdx), url },
    { name: 'x-test-user-role', value: testUserRole, url },
  ])
}

export const adminTest = base.extend<{ forEachTest: void }>({
  forEachTest: [
    async ({ page, request, baseURL }, use) => {
      // This code runs before every test.

      // setupLogging(page)

      /*
       * Parallel worker isolation: each worker has its own test user identified by the worker index.
       */

      const testUserIdx = adminTest.info().workerIndex
      const testUserRole = 'admin'

      await setTestUser(page, baseURL, testUserIdx, testUserRole)

      await request.post('/api/test/reset-test-data', { data: { testUserIdx, testUserRole } })

      // Run the test
      await use()

      // This code runs after every test.
      // console.log('Last URL:', page.url());
    },
    { auto: true },
  ], // automatically starts for every test.
})

export const teacherTest = base.extend<{ forEachTest: void }>({
  forEachTest: [
    async ({ page, request, baseURL }, use) => {
      // This code runs before every test.

      // setupLogging(page)

      /*
       * Parallel worker isolation: each worker has its own test user identified by the worker index.
       */

      const testUserIdx = studentTest.info().workerIndex
      const testUserRole = 'teacher'

      await setTestUser(page, baseURL, testUserIdx, testUserRole)

      await request.post('/api/test/reset-test-data', { data: { testUserIdx, testUserRole } })

      // Run the test
      await use()

      // This code runs after every test.
      // console.log('Last URL:', page.url());
    },
    { auto: true },
  ], // automatically starts for every test.
})

export const studentTest = base.extend<{ forEachTest: void }>({
  forEachTest: [
    async ({ page, request, baseURL }, use) => {
      // This code runs before every test.

      // setupLogging(page)

      /*
       * Parallel worker isolation: each worker has its own test user identified by the worker index.
       */

      const testUserIdx = studentTest.info().workerIndex
      const testUserRole = 'student'

      await setTestUser(page, baseURL, testUserIdx, testUserRole)

      await request.post('/api/test/reset-test-data', { data: { testUserIdx, testUserRole } })

      // Run the test
      await use()

      // This code runs after every test.
      // console.log('Last URL:', page.url());
    },
    { auto: true },
  ], // automatically starts for every test.
})

export const TestByRole = {
  student: studentTest,
  teacher: teacherTest,
  admin: adminTest,
}
