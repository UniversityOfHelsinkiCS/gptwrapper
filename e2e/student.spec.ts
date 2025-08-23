import { expect } from '@playwright/test'
import { acceptDisclaimer, closeSendPreference, sendChatMessage } from './utils/test-helpers'
import { studentTest as test } from './fixtures'

test.describe('Student', () => {
  test('Enrolled chat works', async ({ page }) => {
    await page.goto('/v2/test-course')
    await acceptDisclaimer(page)

    await page.getByTestId('model-selector').first().click()
    await page.getByRole('option', { name: 'mock' }).click()

    await sendChatMessage(page, 'testinen morjens')
    await closeSendPreference(page)

    await expect(page.getByTestId('user-message')).toContainText('testinen morjens')
    await expect(page.getByTestId('assistant-message')).toContainText('You are calling mock endpoint for streaming mock data')
  })

  test('is sent to chats page from general chat', async ({ page }) => {
    // Tries to access general chat
    await page.goto('/v2')
    // Student is sent to chats page
    await expect(page).not.toHaveURL(/v2\/sandbox/)
    await expect(page).toHaveURL(/chats/)
  })

  test('is sent to chats page from non-enrolled course', async ({ page }) => {
    // Tries to access sandbox course
    await page.goto('/v2/sandbox')
    // Student is sent to chats page
    await expect(page).not.toHaveURL(/v2\/sandbox/)
    await expect(page).toHaveURL(/chats/)
  })
})
