import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('Can visit home', async ({ page }) => {
  // Assert that the page title is CurreChat
  await page.title().then((title) => {
    expect(title).toBe('CurreChat')
  })
  await page.screenshot({ path: 'screenshots/home.png' })
})
