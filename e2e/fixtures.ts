import { test as base } from '@playwright/test'
import { setupLogging } from './utils/logging'

export const adminTest = base.extend<{ forEachTest: void }>({
  forEachTest: [
    async ({ page, request }, use) => {
      // This code runs before every test.

      // setupLogging(page)

      /*
       * Parallel worker isolation: each worker has its own test user identified by the worker index.
       */

      const testUserIdx = adminTest.info().workerIndex
      const testUserRole = 'admin'

      page.context().setExtraHTTPHeaders({
        'x-test-user-index': String(testUserIdx),
        'x-test-user-role': testUserRole,
      })

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
    async ({ page, request }, use) => {
      // This code runs before every test.

      // setupLogging(page)

      /*
       * Parallel worker isolation: each worker has its own test user identified by the worker index.
       */

      const testUserIdx = studentTest.info().workerIndex
      const testUserRole = 'teacher'

      page.context().setExtraHTTPHeaders({
        'x-test-user-index': String(testUserIdx),
        'x-test-user-role': testUserRole,
      })

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
    async ({ page, request }, use) => {
      // This code runs before every test.

      // setupLogging(page)

      /*
       * Parallel worker isolation: each worker has its own test user identified by the worker index.
       */

      const testUserIdx = studentTest.info().workerIndex
      const testUserRole = 'student'

      page.context().setExtraHTTPHeaders({
        'x-test-user-index': String(testUserIdx),
        'x-test-user-role': testUserRole,
      })

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
