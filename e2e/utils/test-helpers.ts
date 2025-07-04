import { Page, Locator, expect } from '@playwright/test'

/**
 * Test utilities for common e2e testing functions
 */

/**
 * Wait for element to be visible with custom timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<Locator> {
  const element = page.locator(selector)
  await expect(element).toBeVisible({ timeout })
  return element
}

/**
 * Wait for any of multiple elements to be visible
 */
export async function waitForAnyElement(
  page: Page,
  selectors: string[],
  timeout: number = 10000
): Promise<{ element: Locator; selector: string; index: number } | null> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i]
      const element = page.locator(selector)

      try {
        await expect(element).toBeVisible({ timeout: 1000 })
        return { element, selector, index: i }
      } catch {
        // Continue to next selector
      }
    }

    // Wait a bit before retrying
    await page.waitForTimeout(500)
  }

  return null
}

/**
 * Fill form field with validation
 */
export async function fillField(
  page: Page,
  selector: string,
  value: string,
  shouldValidate: boolean = true
): Promise<void> {
  const field = page.locator(selector)
  await expect(field).toBeVisible()
  await field.click()
  await field.fill(value)

  if (shouldValidate) {
    await expect(field).toHaveValue(value)
  }
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(
  page: Page,
  name: string,
  fullPage: boolean = true
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `test-results/screenshots/${name}-${timestamp}.png`
  await page.screenshot({ path: filename, fullPage })
}

/**
 * Wait for network to be idle and page to be fully loaded
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.waitForLoadState('domcontentloaded')

  // Wait for any potential lazy-loaded content
  await page.waitForTimeout(1000)
}

/**
 * Check if element exists without throwing error
 */
export async function elementExists(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ timeout, state: 'visible' })
    return true
  } catch {
    return false
  }
}

/**
 * Get text content safely
 */
export async function getTextContent(
  page: Page,
  selector: string
): Promise<string | null> {
  try {
    const element = page.locator(selector)
    await expect(element).toBeVisible({ timeout: 5000 })
    return await element.textContent()
  } catch {
    return null
  }
}

/**
 * Click element with retry logic
 */
export async function clickWithRetry(
  page: Page,
  selector: string,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null

  for (let i = 0; i < maxRetries; i++) {
    try {
      const element = page.locator(selector)
      await expect(element).toBeVisible()
      await element.click()
      return
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        await page.waitForTimeout(1000)
      }
    }
  }

  throw lastError
}

/**
 * Monitor console for errors
 */
export function setupConsoleErrorMonitoring(page: Page): {
  getErrors: () => string[]
  clearErrors: () => void
} {
  const consoleErrors: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  return {
    getErrors: () => [...consoleErrors],
    clearErrors: () => {
      consoleErrors.length = 0
    }
  }
}

/**
 * Check for network errors
 */
export function setupNetworkErrorMonitoring(page: Page): {
  getFailedRequests: () => Array<{ url: string; status: number }>
  clearFailedRequests: () => void
} {
  const failedRequests: Array<{ url: string; status: number }> = []

  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedRequests.push({
        url: response.url(),
        status: response.status()
      })
    }
  })

  return {
    getFailedRequests: () => [...failedRequests],
    clearFailedRequests: () => {
      failedRequests.length = 0
    }
  }
}

/**
 * Wait for API call to complete
 */
export async function waitForApiCall(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout }
  )
}

/**
 * Test different viewport sizes
 */
export async function testResponsiveDesign(
  page: Page,
  testCallback: (viewportName: string) => Promise<void>
): Promise<void> {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1200, height: 800 },
    { name: 'large-desktop', width: 1920, height: 1080 }
  ]

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.waitForTimeout(500) // Allow for responsive changes
    await testCallback(viewport.name)
  }
}

/**
 * Accessibility helpers
 */
export async function checkBasicAccessibility(page: Page): Promise<void> {
  // Check for alt text on images
  const images = page.locator('img')
  const imageCount = await images.count()

  for (let i = 0; i < imageCount; i++) {
    const img = images.nth(i)
    const alt = await img.getAttribute('alt')
    const src = await img.getAttribute('src')

    // Images should have alt text (can be empty for decorative images)
    expect(alt).not.toBeNull()
  }

  // Check for proper heading hierarchy
  const headings = page.locator('h1, h2, h3, h4, h5, h6')
  const headingCount = await headings.count()

  if (headingCount > 0) {
    // Should have at least one h1
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThan(0)
  }
}

/**
 * Mock API responses
 */
export async function mockApiResponse(
  page: Page,
  url: string | RegExp,
  response: any,
  status: number = 200
): Promise<void> {
  await page.route(url, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * Clear all storage
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  // Clear cookies
  const context = page.context()
  await context.clearCookies()
}

/**
 * Login helper (customize based on your auth system)
 */
export async function login(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  // This is a generic login helper - customize based on your authentication system
  await page.goto('/login')

  const usernameField = page.locator('input[name="username"], input[name="email"], input[type="email"]')
  const passwordField = page.locator('input[name="password"], input[type="password"]')
  const loginButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login")')

  if (await usernameField.isVisible()) {
    await usernameField.fill(username)
  }

  if (await passwordField.isVisible()) {
    await passwordField.fill(password)
  }

  if (await loginButton.isVisible()) {
    await loginButton.click()
  }

  // Wait for navigation after login
  await page.waitForLoadState('networkidle')
}
