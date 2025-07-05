import { expect, test } from '@playwright/test'

test.describe('Chat v2 Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('requestfailed', (request) => {
      console.log('Request failed: ' + request.url() + ' ' + request.failure()?.errorText)
    })

    page.on('console', (msg) => {
      console.log(`Console message: ${msg.text()}`)
    })

    page.on('crash', () => {
      console.log('Page crashed')
    })

    page.on('pageerror', (error) => {
      console.log('Page error: ' + error.message)
    })

    await page.goto('/v2')
    // Press esc to close disclaimer modal if present
    await page.keyboard.press('Escape')
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
