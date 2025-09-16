import { expect } from '@playwright/test'
import { teacherTest as test } from './fixtures'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'

test.describe('Prompts', () => {
  test('Custom prompt text works', async ({ page }) => {
    await page.goto('/')

    await acceptDisclaimer(page)

    // Select mock model
    await useMockModel(page)

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
    await closeSendPreference(page)

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

    await page.getByTestId('create-prompt-button').click()

    await page.getByTestId('prompt-name-input').fill(newPromptName)
    await page.getByTestId('system-message-input').fill('mocktest kurssitesti onnistui')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.getByTestId('close-prompt-editor').click()

    // Prompt is created and link is visible
    await page.getByText(`Link to chat with the prompt '${newPromptName}' active`).click()

    // Now in chat view
    await acceptDisclaimer(page)

    // The prompt is active.
    await expect(page.getByTestId('prompt-selector-button').first()).toContainText(newPromptName)

    // When prompt selector is opened, it is also visible in the list, so 2 times.
    await page.getByTestId('prompt-selector-button').click()
    expect(await page.getByText(newPromptName).count()).toBeGreaterThan(1)

    // Close selector
    await page.keyboard.press('Escape')

    // Close settings
    await page.keyboard.press('Escape')

    await useMockModel(page)

    // Send something
    await sendChatMessage(page, 'testinen morjens')
    await closeSendPreference(page)

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
    await page.getByTestId('prompt-selector-button').click()

    // Prompt is not visible anymore in student view.
    expect(page.getByText(newPromptName, { exact: true })).not.toBeVisible()
  })

  test('Prompt with RAG works', async ({ page }) => {
    await page.goto('/courses/test-course/prompts')

    const newPromptName = `testausprompti-${test.info().workerIndex}-rag`

    await page.getByTestId('create-prompt-button').click()

    await page.getByTestId('prompt-name-input').fill(newPromptName)
    await page.getByTestId('system-message-input').fill('what ever')
    await page.getByTestId('rag-select').click()
    await page.getByTestId(`source-material-rag-${test.info().workerIndex}-teacher`).click()
    await page.getByRole('button', { name: 'Save' }).click()

    await page.getByTestId('close-prompt-editor').click()

    // Prompt is created and link is visible
    await page.getByText(`Link to chat with the prompt '${newPromptName}' active`).click()

    // Now in chat view
    await acceptDisclaimer(page)

    // The prompt is active.
    await expect(page.getByTestId('prompt-selector-button').first()).toContainText(newPromptName)

    await useMockModel(page)

    // Send something
    await sendChatMessage(page, 'rag')
    await closeSendPreference(page)

    // The result should be echo of the course prompt
    await expect(page.getByTestId('assistant-message')).toContainText('Ok! Got some great results from that mock tool call!')

    await expect(page.getByTestId('sources-header')).toBeVisible()
  })

  test('Own prompts work in course chat and normal chat', async ({ page }) => {
    // First create own prompt in course chat view
    await page.goto('/test-course')
    await acceptDisclaimer(page)
    await page.getByTestId('settings-button').click()
    const modal = page.getByTestId('settings-modal')

    // Fill system message input
    const newPromptName = `test-own-prompt-${test.info().workerIndex}`
    const newPromptContent = `mocktest ${newPromptName} works`
    await modal.getByTestId('assistant-instructions-input').fill(newPromptContent)

    // Save as own prompt
    await modal.getByTestId('save-my-prompt-button').click()
    await page.getByTestId('save-my-prompt-name').fill(newPromptName)
    await page.getByTestId('save-my-prompt-submit').click()

    // It is active now with the correct name
    await expect(modal.getByTestId('prompt-selector-button')).toContainText(newPromptName)
    // Close settings and check sidebar
    await modal.getByTestId('close-settings').click()
    await page.getByTestId('prompt-selector-button').first().click()
    await expect(page.getByText('My prompts')).toBeVisible()
    await expect(page.getByText(newPromptName, { exact: true })).toHaveCount(2) // Visible in the button and in the menu list

    // Now go to normal chat
    await page.goto('/')

    // Own prompt is visible in normal chat
    await page.getByTestId('prompt-selector-button').click()
    await expect(page.getByText('My prompts')).toBeVisible()
    const ownPromptInMenu = page.getByText(newPromptName, { exact: true })
    await expect(ownPromptInMenu).toHaveCount(1) // Visible in the menu list

    // Activate it
    await ownPromptInMenu.click()

    // Check its content
    await page.getByTestId('settings-button').click()
    await expect(page.getByTestId('assistant-instructions-input')).toHaveValue(newPromptContent)
    await page.getByTestId('close-settings').click()

    await useMockModel(page)

    // Send message, response should echo the prompt
    await sendChatMessage(page, 'testinen morjens')
    await closeSendPreference(page)

    // Own prompt echoed:
    await expect(page.getByTestId('assistant-message')).toContainText(newPromptContent)
  })
})
