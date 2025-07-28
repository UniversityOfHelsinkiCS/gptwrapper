import { test as base } from '@playwright/test'
import { setupLogging } from './utils/logging'

export const test = base.extend<{ forEachTest: void }>({
  forEachTest: [
    async ({ page, request }, use) => {
      // This code runs before every test.

      // setupLogging(page)

      /*
       * Parallel worker isolation: each worker has its own test user identified by the worker index.
       */

      page.context().setExtraHTTPHeaders({
        'x-test-user-index': String(test.info().workerIndex),
      })

      await request.post('/api/test/reset-test-data', { data: { testUserIdx: test.info().workerIndex } })

      // Run the test
      await use()

      // This code runs after every test.
      // console.log('Last URL:', page.url());
    },
    { auto: true },
  ], // automatically starts for every test.
})
