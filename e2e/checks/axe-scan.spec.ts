import { test } from '@playwright/test'

import { scan, writeAxeReport } from '../axe/axe_utils'

test.describe('axe wcag scan', () => {
  test.afterAll(writeAxeReport)

  test('scan home', async ({ page }, testInfo) => {
    await page.goto('/')

    await scan(page, testInfo.title)
  })
})
