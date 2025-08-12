import { test } from './fixtures'
import { expect } from '@playwright/test'
import { acceptDisclaimer } from './utils/test-helpers'

test.describe('Prompts', () => {
  test('Prompt creation, chat link with prompt, and deletion', async ({ page }) => {
    await page.goto('/courses/test-course/prompts')

    const newPromptName = `testausprompti-${test.info().workerIndex}`

    await page.getByRole('textbox', { name: 'Prompt name' }).fill(newPromptName)
    await page.getByRole('textbox', { name: 'e.g. You are a helpful' }).fill('sanot aina "testi onnistui"')
    await page.getByRole('button', { name: 'Save' }).click()

    // Prompt is created and link is visible
    await page.getByText(`Link to chat with the prompt '${newPromptName}' active`).click()

    // Now in chat view
    await acceptDisclaimer(page)
    await page.getByRole('button', { name: 'Chat settings' }).click()

    // The prompt is active.
    expect(page.getByText(newPromptName)).toBeVisible()

    // When prompt selector is opened, it is also visible in the list, so 2 times:
    await page.locator('#prompt-selector-button').click()
    expect(await page.getByText(newPromptName).count()).toBe(2)

    // Back to course page, delete the prompt
    await page.goto('/courses/test-course/prompts')

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByTestId(`delete-prompt-${newPromptName}`).click()

    // Prompt is not visible anymore
    expect(page.getByText(newPromptName)).not.toBeVisible()

    // Go to student view from link
    await page.getByText('To student view').click()
    await page.getByRole('button', { name: 'Chat settings' }).click()
    await page.locator('#prompt-selector-button').click()

    // Prompt is not visible anymore in student view.
    expect(page.getByText(newPromptName)).not.toBeVisible()
  })
})
