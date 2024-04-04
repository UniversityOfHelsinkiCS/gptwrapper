import { test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('Can visit home', async ({ page }) => {
  // Assert that the page has text "Contact support:"
  await page.getByText('Contact support:').isVisible()

  await page.screenshot({ path: 'screenshots/home.png' })
})
