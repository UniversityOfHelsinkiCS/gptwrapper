import { test, expect } from '@playwright/test'

test.describe('Health Check Tests', () => {
  test('Application loads successfully', async ({ page }) => {
    await page.goto('/')

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle')

    // Check that we get a successful response
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('Page has expected title and basic elements', async ({ page }) => {
    await page.goto('/')

    // Check page title
    await expect(page).toHaveTitle(/CurreChat/)

    // Check that essential elements are present
    await expect(page.locator('body')).toBeVisible()
  })

  test('API ping endpoint responds', async ({ request }) => {
    const response = await request.get('/api/ping')
    expect(response.status()).toBe(200)
  })

  test('No console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Filter out common non-critical errors
    const criticalErrors = consoleErrors.filter(
      (error) => !error.includes('favicon.ico') && !error.includes('net::ERR_FAILED') && !error.toLowerCase().includes('blocked by cors'),
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test('Page is responsive', async ({ page }) => {
    await page.goto('/')

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('body')).toBeVisible()

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('body')).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 })
    await expect(page.locator('body')).toBeVisible()
  })
})
