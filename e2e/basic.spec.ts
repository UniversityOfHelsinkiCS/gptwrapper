import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('Can visit home', async ({ page }) => {
  await page.screenshot({ path: 'screenshots/home.png' })
  await expect(page.getByText('Contact support')).toBeVisible()
})
