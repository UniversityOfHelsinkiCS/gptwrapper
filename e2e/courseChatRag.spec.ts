import { expect } from '@playwright/test'
import { acceptDisclaimer, closeSendPreference, sendChatMessage } from './utils/test-helpers'
import { studentTest as test } from './fixtures'

test.describe('Course Chat v2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v2/test-course')
    await acceptDisclaimer(page)
  })

  test('Course chat works', async ({ page }) => {
    await page.getByTestId('model-selector').first().click()
    await page.getByRole('option', { name: 'mock' }).click()

    await sendChatMessage(page, 'testinen morjens')
    await closeSendPreference(page)

    await expect(page.getByTestId('user-message')).toContainText('testinen morjens')
    await expect(page.getByTestId('assistant-message')).toContainText('You are calling mock endpoint for streaming mock data')
  })

  test('Course chat RAG feature', async ({ page }) => {
    const ragName = `rag-${test.info().workerIndex}`
    await page.locator('#rag-index-selector').first().click()
    await page.getByRole('menuitem', { name: ragName }).click()

    await sendChatMessage(page, 'rag')
    await closeSendPreference(page)

    // Shows file search loading indicator
    await expect(page.getByTestId('tool-call-message')).toBeVisible()

    // Responds with RAG mock document text
    await expect(page.getByTestId('assistant-message')).toContainText('This is the first mock document')

    // Source button is visible
    await expect(page.getByTestId('file-search-sources')).toBeVisible()

    // Sources drawer has been opened and title is visible
    await expect(page.getByTestId('sources-header')).toBeVisible()

    // Three source items should be visible
    await expect(page.getByTestId('sources-truncated-item')).toHaveCount(3)
  })
})
