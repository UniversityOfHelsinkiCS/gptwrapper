import { expect } from '@playwright/test'
import { teacherTest as test } from './fixtures'
import { acceptDisclaimer } from './utils/test-helpers'

test.describe('Prompts', () => {
  test('Custom prompt text works', async ({ page }) => {
    await page.goto('/v2')

    await acceptDisclaimer(page)

    // Select mock model
    await page.getByTestId('model-selector').first().click()
    await page.getByRole('option', { name: 'mock' }).click()

    // Open settings
    await page.getByTestId('settings-button').click()

    // Write prompt in input (mocktest is the keyword to toggle echoing)
    await page.getByTestId('assistant-instructions-input').fill('mocktest testi onnistui')

    // Close modal
    await page.keyboard.press('Escape')

    // Send something
    let chatInput = page.getByTestId('chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')

    // Close send preference configurator
    await page.locator('#send-preference-configurator-submit').click()

    // The result should be echo of prompt
    await expect(page.getByTestId('assistant-message')).toContainText('mocktest testi onnistui')

    // Clear chat
    page.on('dialog', (dialog) => dialog.accept())
    await page.getByTestId('empty-conversation-button').click()

    // Reload page to ensure prompt is saved
    await page.reload()

    chatInput = page.getByTestId('chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')

    // The result should be echo of prompt, again
    await expect(page.getByTestId('assistant-message')).toContainText('mocktest testi onnistui')

    // Also check the settings modal one more time
    await page.getByTestId('settings-button').click()
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
    await page.getByTestId('settings-button').click()

    // The prompt is active.
    expect(page.getByText(newPromptName)).toBeVisible()

    // When prompt selector is opened, it is also visible in the list, so 2 times:
    await page.getByTestId('prompt-selector-button').click()
    expect(await page.getByText(newPromptName).count()).toBe(2)

    // Close selector
    await page.keyboard.press('Escape')

    // Close settings
    await page.keyboard.press('Escape')

    // Send something
    const chatInput = page.getByTestId('chat-input').first()
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
    await page.getByTestId('settings-button').click()
    await page.getByTestId('prompt-selector-button').click()

    // Prompt is not visible anymore in student view.
    expect(page.getByText(newPromptName)).not.toBeVisible()
  })

  test('Own prompts work in course chat and normal chat', async ({ page }) => {
    // First create own prompt in course chat view
    await page.goto('/v2/test-course')
    await acceptDisclaimer(page)
    await page.getByTestId('settings-button').click()

    // Fill system message input
    const newPromptName = `test-own-prompt-${test.info().workerIndex}`
    const newPromptContent = `mocktest ${newPromptName} works`
    await page.getByTestId('assistant-instructions-input').fill(newPromptContent)

    // Save as own prompt
    await page.getByTestId('save-my-prompt-button').click()
    await page.getByTestId('save-my-prompt-name').fill(newPromptName)
    await page.getByTestId('save-my-prompt-submit').click()

    // It is active now with the correct name
    await expect(page.getByTestId('prompt-selector-button')).toContainText(newPromptName)
    await page.getByTestId('prompt-selector-button').click()
    await expect(page.getByText('My prompts')).toBeVisible()
    await expect(page.getByText(newPromptName, { exact: true })).toHaveCount(2) // Visible in the button and in the menu list

    // Now go to normal chat
    await page.goto('/v2')
    await page.getByTestId('settings-button').click()

    // Own prompt is visible in normal chat
    await page.getByTestId('prompt-selector-button').click()
    await expect(page.getByText('My prompts')).toBeVisible()
    const ownPromptInMenu = page.getByText(newPromptName, { exact: true })
    await expect(ownPromptInMenu).toHaveCount(1) // Visible in the menu list

    // Activate it
    await ownPromptInMenu.click()
    await expect(page.getByTestId('assistant-instructions-input')).toHaveValue(newPromptContent)

    // Close settings
    await page.keyboard.press('Escape')

    // Send message, response should echo the prompt
    const chatInput = page.getByTestId('chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')

    // Close send preference configurator
    await page.locator('#send-preference-configurator-submit').click()

    // Own prompt echoed:
    await expect(page.getByTestId('assistant-message')).toContainText(newPromptContent)
  })
})
