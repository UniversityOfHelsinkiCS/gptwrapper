import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect } from '@playwright/test'
import { adminTest, teacherTest as test } from './fixtures'
import { acceptDisclaimer, closeSendPreference, closeSnackbars, sendChatMessage, useMockModel } from './utils/test-helpers'

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

    await page.getByTestId('create-personal-prompt-button').click()
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
    await page.getByTestId('new-conversation-button').click()
    await page.getByTestId('submit-confirm-reset').click()
    await expect(page.getByTestId('assistant-message')).not.toBeVisible()

    // Reload page to ensure prompt is saved
    await page.reload()

    chatInput = page.getByTestId('chat-input').first()
    await chatInput.fill('testinen morjens')
    await chatInput.press('Shift+Enter')

    // The result should be echo of prompt, again
    await expect(page.getByTestId('assistant-message')).toContainText('mocktest testi onnistui')

    // Also check the settings modal one more time
    await page.getByTestId('choose-prompt-button').click()
    await page.getByTestId('prompt-row-mocktest testi onnistui').click()
    await page.getByTestId('edit-prompt-mocktest testi onnistui').click()
    await expect(page.getByTestId('system-message-input')).toContainText('mocktest testi onnistui')
  })

  test('Course prompt creation, chat link with prompt, and deletion', async ({ page }) => {
    await page.goto('/test-course-course-id')
    await useMockModel(page)

    const newPromptName = `testausprompti-${test.info().workerIndex}`

    await page.getByTestId('choose-prompt-button').click()
    await page.getByTestId('create-course-prompt-test-course-course-id-button').click()
    await page.getByTestId('prompt-name-input').fill(newPromptName)
    await page.getByTestId('system-message-input').fill('mocktest kurssitesti onnistui')
    await page.getByRole('button', { name: 'Save' }).click()

    // Select the prompt by clicking its row
    await page.getByTestId(`prompt-row-${newPromptName}`).click()

    await expect(page.getByTestId(`prompt-preview-title-for-${newPromptName}`)).toContainText(newPromptName)
    await page.getByTestId('change-to-prompt-button').click()
    // Now in chat view
    // The prompt is active.

    // Send something
    await sendChatMessage(page, 'testinen morjens')
    await closeSendPreference(page)

    // The result should be echo of the course prompt
    await expect(page.getByTestId('assistant-message')).toContainText('mocktest kurssitesti onnistui')

    // Back to course page, delete the prompt
    await page.goto('/test-course-course-id/prompts')

    await page.getByTestId(`prompt-row-${newPromptName}`).click()
    await page.getByTestId(`delete-prompt-${newPromptName}`).click()
    await page.getByTestId('confirm-dialog-confirm').click()

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

  test('Copying a prompt to a course and to own prompts', async ({ page }) => {
    const newPromptName = `kopiointiprompti-${test.info().workerIndex}`

    await page.goto('/test-course-course-id/prompts')

    await page.getByTestId('create-course-prompt-test-course-course-id-button').click()
    await page.getByTestId('prompt-name-input').fill(newPromptName)
    await page.getByTestId('system-message-input').fill('mocktest kopiointi onnistui')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.getByTestId(`prompt-row-${newPromptName}`).click()

    // Copying into the source course duplicates it, so the name gets a number
    await page.getByTestId('copy-prompt-button').click()
    await page.getByTestId('copy-target-test-course-course-id').click()
    await expect(page.getByTestId(`prompt-row-${newPromptName} (2)`)).toBeVisible()

    // The same name is free in own prompts, so the copy keeps it
    await page.getByTestId(`prompt-row-${newPromptName}`).click()
    await page.getByTestId('copy-prompt-button').click()
    await page.getByTestId('copy-target-personal').click()

    await page.getByTestId('my-prompts-open').click()
    await expect(page.getByTestId(`prompt-row-${newPromptName}`)).toHaveCount(2)

    await closeSnackbars(page)

    // The copy is independent: editing it leaves the original alone.
    // My prompts renders above the courses, so the personal copy is the first row.
    await page.getByTestId(`prompt-row-${newPromptName}`).first().click()
    await page.getByTestId(`edit-prompt-${newPromptName}`).click()
    await page.getByTestId('system-message-input').fill('mocktest kopio muokattu')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.getByTestId(`prompt-row-${newPromptName}`).last().click()
    await expect(page.getByTestId(`prompt-preview-title-for-${newPromptName}`)).toBeVisible()
    await expect(page.getByText('mocktest kopiointi onnistui')).toBeVisible()
  })

  test('Prompt with RAG works', async ({ page }) => {
    await page.goto('/test-course-course-id')

    await useMockModel(page)

    const newPromptName = `testausprompti-${test.info().workerIndex}-rag`

    await page.getByTestId('choose-prompt-button').click()
    await page.getByTestId('create-course-prompt-test-course-course-id-button').click()

    await page.getByTestId('prompt-name-input').fill(newPromptName)
    await page.getByTestId('system-message-input').fill('what ever')
    await page.getByTestId('rag-select').click()
    await page.getByTestId(`source-material-rag-${test.info().workerIndex}-teacher`).click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Dialog closes automatically, now back at prompts list
    // Select the prompt by clicking on its row
    await page.getByTestId(`prompt-row-${newPromptName}`).click()

    await expect(page.getByTestId(`prompt-preview-title-for-${newPromptName}`)).toContainText(newPromptName)
    await page.getByTestId(`change-to-prompt-button`).click()

    // Now in chat view
    // The prompt is active.
    await expect(page.getByTestId('prompt-name').first()).toContainText(newPromptName)

    // Send something
    await sendChatMessage(page, 'rag')
    await closeSendPreference(page)

    // The result should be echo of the course prompt
    await expect(page.getByTestId('assistant-message')).toContainText('Ok! Got some great results from that mock tool call!')

    await expect(page.getByTestId('open-annotations')).toBeVisible()
    await expect(page.getByTestId('sources-header')).toBeHidden()
    await page.getByTestId('file-search-sources').click()
    await expect(page.getByTestId('sources-header')).toBeVisible()
    await page.getByTestId('toggle-source-details').click()
    await expect(page.locator('#tool-result-details')).toBeVisible()
  })

  test('RAG sources and an open file share the right slot', async ({ page }) => {
    const root = mkdtempSync(join(tmpdir(), 'sources-viewer-'))
    try {
      await page.goto('/test-course-course-id')
      await useMockModel(page)

      const promptName = `testausprompti-${test.info().workerIndex}-rag-viewer`
      await page.getByTestId('choose-prompt-button').click()
      await page.getByTestId('create-course-prompt-test-course-course-id-button').click()
      await page.getByTestId('prompt-name-input').fill(promptName)
      await page.getByTestId('system-message-input').fill('what ever')
      await page.getByTestId('rag-select').click()
      await page.getByTestId(`source-material-rag-${test.info().workerIndex}-teacher`).click()
      await page.getByRole('button', { name: 'Save' }).click()
      await page.getByTestId(`prompt-row-${promptName}`).click()
      await page.getByTestId(`change-to-prompt-button`).click()
      await expect(page.getByTestId('prompt-name').first()).toContainText(promptName)

      // Open a file from My files
      mkdirSync(join(root, 'Course notes'), { recursive: true })
      writeFileSync(join(root, 'Course notes', 'lecture.md'), '# Week 3')
      await page.getByTestId('my-files-button').click()
      const dialog = page.getByRole('dialog', { name: 'My files' })
      await dialog.getByTestId('my-files-input-folder').setInputFiles(join(root, 'Course notes'))
      await expect(dialog.getByTestId('my-files-status')).toContainText('New: 1')
      await dialog.getByRole('button', { name: /^Course notes/ }).click()
      await dialog.getByRole('button', { name: 'Open lecture.md' }).click()
      const viewer = page.getByRole('region', { name: 'lecture.md' })
      await expect(viewer).toBeVisible()

      await sendChatMessage(page, 'rag')
      await closeSendPreference(page)
      await expect(page.getByTestId('assistant-message')).toContainText('Ok! Got some great results from that mock tool call!')

      // The collapsed sources toggle is in the rail next to the viewer, opening it swaps the slot to the sources.
      await closeSnackbars(page)
      await expect(viewer).toBeVisible()
      await expect(page.getByTestId('sources-header')).toBeHidden()
      await page.getByTestId('open-annotations').click()
      await expect(page.getByTestId('sources-header')).toBeVisible()
      await expect(viewer).toBeHidden()

      // Closing the sources brings the viewer back.
      await page.getByTestId('close-annotations').click()
      await expect(viewer).toBeVisible()
      await expect(viewer).toBeFocused()
      await expect(page.getByTestId('sources-header')).toBeHidden()
      await expect(page.getByTestId('open-annotations')).toBeVisible()

      // A minimized file shares the rail with the sources toggle, and expanding either one takes the slot.
      await viewer.getByRole('button', { name: 'Minimize lecture.md' }).click()
      await expect(viewer).toBeHidden()
      const rail = page.getByTestId('right-rail')
      await expect(rail.getByTestId('open-annotations')).toBeVisible()
      await expect(rail.getByRole('button', { name: 'Open lecture.md' })).toBeVisible()
      await rail.getByTestId('open-annotations').click()
      await expect(page.getByTestId('sources-header')).toBeVisible()
      await expect(viewer).toBeHidden()
      await rail.getByRole('button', { name: 'Open lecture.md' }).click()
      await expect(viewer).toBeVisible()
      await expect(viewer).toBeFocused()
      await expect(page.getByTestId('sources-header')).toBeHidden()
      await expect(rail.getByTestId('open-annotations')).toBeVisible()

      // The sources link in the message swaps it too, and opening a file takes the slot back.
      await page.getByTestId('file-search-sources').click()
      await expect(page.getByTestId('sources-header')).toBeVisible()
      await expect(viewer).toBeHidden()
      await page.getByTestId('my-files-button').click()
      await dialog.getByRole('button', { name: /^Course notes/ }).click()
      await dialog.getByRole('button', { name: 'Open lecture.md' }).click()
      await expect(viewer).toBeVisible()
      await expect(page.getByTestId('sources-header')).toBeHidden()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

test.describe('Prompt tools', () => {
  adminTest('an admin turns on an experimental tool, and it is saved and loaded with the prompt', async ({ page }, testInfo) => {
    const promptName = `quiz-tool-prompt-${testInfo.workerIndex}`

    await page.goto('/general')
    await acceptDisclaimer(page)
    await page.getByTestId('choose-prompt-button').click()
    await page.getByTestId('create-personal-prompt-button').click()
    await page.getByTestId('prompt-name-input').fill(promptName)
    await page.getByTestId('system-message-input').fill('Ask me quizzes')

    const quizTool = page.getByRole('checkbox', { name: /Quizzes/ })
    await expect(quizTool).not.toBeChecked()
    await expect(page.getByText(/multiple-choice questions shown as interactive cards/)).toBeVisible()
    await quizTool.check()
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByTestId(`prompt-preview-title-for-${promptName}`)).toBeVisible()
    await page.getByTestId(`edit-prompt-${promptName}`).click()
    await expect(page.getByRole('checkbox', { name: /Quizzes/ })).toBeChecked()

    // Turning it off is saved too
    await page.getByRole('checkbox', { name: /Quizzes/ }).uncheck()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByTestId(`prompt-preview-title-for-${promptName}`)).toBeVisible()
    await page.getByTestId(`edit-prompt-${promptName}`).click()
    await expect(page.getByRole('checkbox', { name: /Quizzes/ })).not.toBeChecked()
  })
})
