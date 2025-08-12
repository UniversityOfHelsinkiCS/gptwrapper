import { test } from './fixtures'
import { expect } from '@playwright/test'
import { acceptDisclaimer } from './utils/test-helpers'

test.describe('Prompt creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/v2')
    await acceptDisclaimer(page)
  })

  test('test', async ({ page }) => {
    await page.goto('/courses/test-course/prompts')

    const newPromptName = `testausprompti-${test.info().workerIndex}`

    await page.getByRole('textbox', { name: 'Prompt name' }).fill(newPromptName)
    await page.getByRole('textbox', { name: 'e.g. You are a helpful' }).fill('sanot aina "testi onnistui"')
    await page.getByRole('button', { name: 'Save' }).click()
    expect(page.getByText(newPromptName)).toBeVisible()
    await page.getByText('Link to chat with this prompt active').last().click()

    await page.getByRole('button', { name: 'Chat settings' }).click()

    await page.locator('#prompt-selector-button').click()

    expect(page.getByText(newPromptName)).toBeVisible()
  })
})
