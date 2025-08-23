import { expect } from '@playwright/test'
import { acceptDisclaimer, closeSendPreference, sendChatMessage } from './utils/test-helpers'
import { teacherTest as test } from './fixtures'

test.describe('Chat v2 Conversation tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v2')
    await acceptDisclaimer(page)
  })

  test('Chat v2 mock response works', async ({ page }) => {
    await page.getByTestId('model-selector').first().click()
    await page.getByRole('option', { name: 'mock' }).click()

    await sendChatMessage(page, 'testinen morjens')

    await closeSendPreference(page)

    await expect(page.getByTestId('user-message')).toContainText('testinen morjens')
    await expect(page.getByTestId('assistant-message')).toContainText('You are calling mock endpoint for streaming mock data')
  })

  test('Can empty conversation', async ({ page }) => {
    await page.getByTestId('model-selector').first().click()
    await page.getByRole('option', { name: 'mock' }).click()

    await sendChatMessage(page, 'tää tyhjennetään')

    await closeSendPreference(page)

    await expect(page.getByTestId('user-message')).toContainText('tää tyhjennetään')
    await expect(page.getByTestId('assistant-message')).toContainText('OVER', { timeout: 6000 })

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByTestId('empty-conversation-button').click()

    await expect(page.getByTestId('user-message')).not.toBeVisible()
    await expect(page.getByTestId('assistant-message')).not.toBeVisible()
  })
})
