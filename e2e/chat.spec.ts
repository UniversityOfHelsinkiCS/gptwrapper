import { expect, test } from '@playwright/test'

test.describe('Chat v2 Conversation tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v2')
    await page.locator('#close-disclaimer').click()
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

  test('Can empty conversation', async ({ page }) => {
    await page.locator('#model-selector').first().click()
    await page.getByRole('option', { name: 'mock' }).click()

    const chatInput = page.locator('#chat-input').first()
    await chatInput.fill('tää tyhjennetään')
    await chatInput.press('Shift+Enter')

    await expect(page.getByTestId('user-message')).toContainText('tää tyhjennetään')
    await expect(page.getByTestId('assistant-message')).toContainText('OVER', { timeout: 5000 })

    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('#empty-conversation-button').click()

    await expect(page.getByTestId('user-message')).not.toBeVisible()
    await expect(page.getByTestId('assistant-message')).not.toBeVisible()
  })
})
