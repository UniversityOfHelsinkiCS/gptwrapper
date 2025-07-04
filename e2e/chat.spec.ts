import { expect, test } from '@playwright/test'

test.describe('Chat v2 Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v2')
    // Check for dissclaimer modal and close it if present
    const disclaimerButton = page.locator('#close-disclaimer').first()
    if (await disclaimerButton.isVisible()) {
      await disclaimerButton.click()
    }
  })

  test('Chat v2 mock response works', async ({ page }) => {
    await page.locator('#model-selector').first().click()
    await page.getByRole('option', { name: 'mock' }).click()

    const chatInput = page.locator('#chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')

    await expect(page.getByTestId('user-message')).toContainText('testinen morjens')
    await expect(page.getByTestId('assistant-message')).toContainText('You are calling mock endpoint for streaming mock data')
  })
})
