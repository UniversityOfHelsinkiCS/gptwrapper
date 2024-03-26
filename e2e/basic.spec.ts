import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('Can visit home', async ({ page }) => {
  // Take a screenshot
  await page.screenshot({ path: 'screenshot.png' })
  await expect(page.getByText('CurreChat', { exact: true })).toBeVisible()
})
