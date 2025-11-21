import { expect } from '@playwright/test'
import { teacherTest as test } from './fixtures'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'

test.describe('Prompts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/general')
    await acceptDisclaimer(page)
  })

  test('Custom prompt text works', async ({ page }) => {
    // Select mock model
    await useMockModel(page)

    // Open settings
    await page.getByTestId('choose-prompt-button').click()

    // Write prompt in input (mocktest is the keyword to toggle echoing)

    await page.getByTestId('create-prompt-button').click()
    await page.getByTestId('prompt-name-input').fill('mocktest testi onnistui')
    await page.getByTestId('system-message-input').fill('mocktest testi onnistui')
    await page.getByRole('button', { name: 'Save' }).click()

    // Close modal
    await page.getByTestId('close-modal').click()

    // Send something
    let chatInput = page.getByTestId('chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')
    await closeSendPreference(page)

    // The result should be echo of prompt
    await expect(page.getByTestId('assistant-message')).toContainText('mocktest testi onnistui')

    // Clear chat
    page.on('dialog', (dialog) => dialog.accept())
    await page.getByTestId('new-conversation-button').click()

    // Reload page to ensure prompt is saved
    await page.reload()

    chatInput = page.getByTestId('chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')

    // The result should be echo of prompt, again
    await expect(page.getByTestId('assistant-message')).toContainText('mocktest testi onnistui')

    // Also check the settings modal one more time
    await page.getByTestId('edit-prompt-button').click()
    await expect(page.getByTestId('system-message-input')).toContainText('mocktest testi onnistui')
  })

  test('Course prompt creation, chat link with prompt, and deletion', async ({ page }) => {
    await page.goto('/test-course-course-id')
    await useMockModel(page)

    const newPromptName = `testausprompti-${test.info().workerIndex}`

    await page.getByTestId('choose-prompt-button').click()
    await page.getByTestId('create-prompt-button').click()
    await page.getByTestId('prompt-name-input').fill(newPromptName)
    await page.getByTestId('system-message-input').fill('mocktest kurssitesti onnistui')
    await page.getByRole('button', { name: 'Save' }).click()

    // await page.getByTestId('close-modal').click()

    // Prompt is created and link is visible
    await page.getByText(`Link to chat with the prompt '${newPromptName}' active`).click()

    // Now in chat view
    // The prompt is active.
    await expect(page.getByTestId('prompt-name').first()).toContainText(newPromptName)

    // Send something
    await sendChatMessage(page, 'testinen morjens')
    await closeSendPreference(page)

    // The result should be echo of the course prompt
    await expect(page.getByTestId('assistant-message')).toContainText('mocktest kurssitesti onnistui')

    // Back to course page, delete the prompt
    await page.goto('/test-course-course-id/prompts')

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByTestId(`delete-prompt-${newPromptName}`).click()

    // Prompt is not visible anymore
    await page.reload() // <- 100% less flaky
    expect(page.getByText(newPromptName)).not.toBeVisible()

    /** TODO: deleted course prompts stay in localstorage, so they are visible in students' chat view even after deletion.
    // Go to student view from link
    await page.getByText('To student view').click()
    await page.getByTestId('prompt-selector-button').click()

    // Prompt is not visible anymore in student view.
    expect(page.getByText(newPromptName, { exact: true })).not.toBeVisible()
     */
  })

  test('Prompt with RAG works', async ({ page }) => {
    await page.goto('/test-course-course-id')

    await useMockModel(page)

    const newPromptName = `testausprompti-${test.info().workerIndex}-rag`

    await page.getByTestId('choose-prompt-button').click()
    await page.getByTestId('create-prompt-button').click()

    await page.getByTestId('prompt-name-input').fill(newPromptName)
    await page.getByTestId('system-message-input').fill('what ever')
    await page.getByTestId('rag-select').click()
    await page.getByTestId(`source-material-rag-${test.info().workerIndex}-teacher`).click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Prompt is created and link is visible
    await page.getByText(`Link to chat with the prompt '${newPromptName}' active`).click()

    // Now in chat view
    // The prompt is active.
    await expect(page.getByTestId('prompt-name').first()).toContainText(newPromptName)

    // Send something
    await sendChatMessage(page, 'rag')
    await closeSendPreference(page)

    // The result should be echo of the course prompt
    await expect(page.getByTestId('assistant-message')).toContainText('Ok! Got some great results from that mock tool call!')

    await expect(page.getByTestId('sources-header')).toBeVisible()
  })
})
