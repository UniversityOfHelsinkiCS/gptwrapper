import { expect } from '@playwright/test'
import { acceptDisclaimer } from './utils/test-helpers'
import { test } from './fixtures'

test.describe('Course Chat v2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v2/test-course')
    await acceptDisclaimer(page)
  })

  test('Course chat works', async ({ page }) => {
    await page.getByTestId('model-selector').first().click()
    await page.getByRole('option', { name: 'mock' }).click()

    const chatInput = page.getByTestId('chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')

    await expect(page.getByTestId('user-message')).toContainText('testinen morjens')
    await expect(page.getByTestId('assistant-message')).toContainText('You are calling mock endpoint for streaming mock data')
  })

  test.only('Course chat RAG feature', async ({ page }) => {
    const ragName = `rag-${test.info().workerIndex}`
    await page.locator('#rag-index-selector').first().click()
    await page.getByRole('menuitem', { name: ragName }).click()

    const chatInput = page.getByTestId('chat-input').first()
    await chatInput.fill('rag')
    await chatInput.press('Shift+Enter')

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
