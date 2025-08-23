import { expect } from '@playwright/test'
import { acceptDisclaimer } from './utils/test-helpers'
import { test } from './fixtures'

test.describe('Chat v2 Conversation tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v2')
    await acceptDisclaimer(page)
  })

  test('Chat v2 mock response works', async ({ page }) => {
    await page.getByTestId('model-selector').first().click()
    await page.getByRole('option', { name: 'mock' }).click()

    const chatInput = page.locator('#chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')

    // Close send preference configurator
    await page.locator('#send-preference-configurator-submit').click()

    await expect(page.getByTestId('user-message')).toContainText('testinen morjens')
    await expect(page.getByTestId('assistant-message')).toContainText('You are calling mock endpoint for streaming mock data')
  })

  test('Can empty conversation', async ({ page }) => {
    await page.getByTestId('model-selector').first().click()
    await page.getByRole('option', { name: 'mock' }).click()

    const chatInput = page.locator('#chat-input').first()
    await chatInput.fill('tää tyhjennetään')
    await chatInput.press('Shift+Enter')

    // Close send preference configurator
    await page.locator('#send-preference-configurator-submit').click()

    await expect(page.getByTestId('user-message')).toContainText('tää tyhjennetään')
    await expect(page.getByTestId('assistant-message')).toContainText('OVER', { timeout: 6000 })

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByTestId('empty-conversation-button').click()

    await expect(page.getByTestId('user-message')).not.toBeVisible()
    await expect(page.getByTestId('assistant-message')).not.toBeVisible()
  })
})
