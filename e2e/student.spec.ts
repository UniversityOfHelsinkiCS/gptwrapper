import { expect } from '@playwright/test'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'
import { studentTest as test } from './fixtures'

test.describe('Student', () => {
  test('Enrolled chat works', async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)

    await useMockModel(page)

    await sendChatMessage(page, 'testinen morjens')
    await closeSendPreference(page)

    await expect(page.getByTestId('user-message')).toContainText('testinen morjens')
    await expect(page.getByTestId('assistant-message')).toContainText('You are calling mock endpoint for streaming mock data')
  })

  test('is sent to general page from general chat', async ({ page }) => {
    // Tries to access general chat
    await page.goto('/')
    // Student is sent to chats page
    await expect(page).not.toHaveURL(/sandbox/)
    await expect(page).toHaveURL(/general/)
  })

  test('is sent to general page from non-enrolled course', async ({ page }) => {
    // Tries to access sandbox course
    await page.goto('/sandbox')
    // Student is sent to chats page
    await expect(page).not.toHaveURL(/sandbox/)
    await expect(page).toHaveURL(/general/)
  })

  test('sees only student specific elements in sidebars COURSE SECTION', async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)

    await expect(page.getByTestId('course-settings-button')).toBeHidden()
    await expect(page.getByTestId('course-exit-button')).toBeHidden()
    await expect(page.getByTestId('edit-prompt-button')).toBeHidden()
  })

  test('sees only student specific elements in sidebars PROMPT SECTION', async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)

    await page.getByTestId('choose-prompt-button').click()
    await page.getByTestId('prompt-row-Test Prompt').click()

    await expect(page.getByTestId('edit-prompt-button')).toBeHidden()
    await expect(page.getByTestId('prompt-details-button')).toBeVisible()
  })
})
