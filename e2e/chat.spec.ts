import { test, expect } from '@playwright/test'
import { waitForElement, waitForPageReady, setupConsoleErrorMonitoring, mockApiResponse } from './utils/test-helpers'

test.describe('Chat v2 Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v2')
    await waitForPageReady(page)

    // Check for disclaimer modal and close it if present
    const disclaimerCloseButton = page.locator('#close-disclaimer')
    if (await disclaimerCloseButton.isVisible()) {
      await disclaimerCloseButton.click()
    }
  })
})
