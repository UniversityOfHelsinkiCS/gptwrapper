import { test } from './fixtures'
import { expect } from '@playwright/test'
import { acceptDisclaimer } from './utils/test-helpers'

test.describe('Prompts', () => {
  test('Custom prompt text works', async ({ page }) => {
    await page.goto('/v2')

    await acceptDisclaimer(page)

    // Select mock model
    await page.getByTestId('model-selector').first().click()
    await page.getByRole('option', { name: 'mock' }).click()

    // Open settings
    await page.getByRole('button', { name: 'Chat settings' }).click()

    // Write prompt in input (mocktest is the keyword to toggle echoing)
    await page.getByTestId('assistant-instructions-input').fill('mocktest testi onnistui')

    // Close modal
    await page.keyboard.press('Escape')

    // Send something
    let chatInput = page.locator('#chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')

    // Close send preference configurator
    await page.locator('#send-preference-configurator-submit').click()

    // The result should be echo of prompt
    await expect(page.getByTestId('assistant-message')).toContainText('mocktest testi onnistui')

    // Clear chat
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('#empty-conversation-button').click()

    // Reload page to ensure prompt is saved
    await page.reload()

    chatInput = page.locator('#chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')

    // The result should be echo of prompt, again
    await expect(page.getByTestId('assistant-message')).toContainText('mocktest testi onnistui')

    // Also check the settings modal one more time
    await page.getByRole('button', { name: 'Chat settings' }).click()
    await expect(page.getByTestId('assistant-instructions-input')).toContainText('mocktest testi onnistui')
  })

  test('Course prompt creation, chat link with prompt, and deletion', async ({ page }) => {
    await page.goto('/courses/test-course/prompts')

    const newPromptName = `testausprompti-${test.info().workerIndex}`

    await page.getByRole('textbox', { name: 'Prompt name' }).fill(newPromptName)
    await page.getByRole('textbox', { name: 'e.g. You are a helpful' }).fill('mocktest kurssitesti onnistui')
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

    // Close selector
    await page.keyboard.press('Escape')

    // Close settings
    await page.keyboard.press('Escape')

    // Send something
    const chatInput = page.locator('#chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')

    // The result should be echo of the course prompt
    await expect(page.getByTestId('assistant-message')).toContainText('mocktest kurssitesti onnistui')

    // Back to course page, delete the prompt
    await page.goto('/courses/test-course/prompts')

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByTestId(`delete-prompt-${newPromptName}`).click()

    // Prompt is not visible anymore
    await page.reload() // <- 100% less flaky
    expect(page.getByText(newPromptName)).not.toBeVisible()

    // Go to student view from link
    await page.getByText('To student view').click()
    await page.getByRole('button', { name: 'Chat settings' }).click()
    await page.locator('#prompt-selector-button').click()

    // Prompt is not visible anymore in student view.
    expect(page.getByText(newPromptName)).not.toBeVisible()
  })
})
