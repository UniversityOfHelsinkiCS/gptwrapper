import { expect } from '@playwright/test'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'
import { TestByRole } from './fixtures'
import { FREE_MODEL, validModels } from '../src/config'

// Matrix of tests
const testMatrix: { role: keyof typeof TestByRole; courses: (string | undefined)[] }[] = [
  { role: 'student', courses: ['test-course'] },
  { role: 'teacher', courses: ['test-course', undefined] },
  { role: 'admin', courses: ['test-course', undefined] },
]

testMatrix.forEach((testConfig) => {
  const test = TestByRole[testConfig.role]

  testConfig.courses.forEach((course) => {
    test.describe(`${course ? `Course` : 'General'} chat test for ${testConfig.role}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`/v2/${course || ''}`)
      })

      test('Disclaimer is visible', async ({ page }) => {
        await expect(page.getByTestId('submit-accept-disclaimer')).toBeVisible()
      })

      test('Disclaimer is not visible after accepting and reloading', async ({ page }) => {
        await acceptDisclaimer(page)
        await page.reload()
        await expect(page.getByTestId('submit-accept-disclaimer')).not.toBeVisible()
      })

      test('Disclaimer (help) can be opened manually', async ({ page }) => {
        await acceptDisclaimer(page)
        await page.getByTestId('help-button').click()
        await expect(page.getByTestId('submit-accept-disclaimer')).toBeVisible()
      })

      test('Settings can be opened and closed', async ({ page }) => {
        await acceptDisclaimer(page)
        await page.getByTestId('settings-button').click()
        await expect(page.locator('#close-settings')).toBeVisible()

        await page.keyboard.press('Escape')
        await expect(page.locator('#close-settings')).not.toBeVisible()
      })

      test('Can select model', async ({ page }) => {
        await acceptDisclaimer(page)
        await useMockModel(page)
      })

      test('One message works', async ({ page }) => {
        await acceptDisclaimer(page)
        await useMockModel(page)

        await sendChatMessage(page, 'testinen morjens')

        await closeSendPreference(page)

        await expect(page.getByTestId('user-message')).toContainText('testinen morjens')
        await expect(page.getByTestId('assistant-message')).toContainText('You are calling mock endpoint for streaming mock data')
      })

      test('Multiple messages work', async ({ page }) => {
        await acceptDisclaimer(page)
        await useMockModel(page)

        await sendChatMessage(page, 'say perkele')

        await closeSendPreference(page)

        await expect(page.getByTestId('user-message').first()).toContainText('say perkele')
        await expect(page.getByTestId('assistant-message').first()).toContainText('perkele')

        await sendChatMessage(page, 'say minttuista')

        await expect(page.getByTestId('user-message').nth(1)).toContainText('say minttuista')
        await expect(page.getByTestId('assistant-message').nth(1)).toContainText('minttuista')

        await sendChatMessage(page, 'say settiä')

        await expect(page.getByTestId('user-message').nth(2)).toContainText('say settiä')
        await expect(page.getByTestId('assistant-message').nth(2)).toContainText('settiä')
      })

      test('Can empty conversation', async ({ page }) => {
        await acceptDisclaimer(page)
        await useMockModel(page)

        await sendChatMessage(page, 'tää tyhjennetään')

        await closeSendPreference(page)

        await expect(page.getByTestId('user-message')).toContainText('tää tyhjennetään')
        await expect(page.getByTestId('assistant-message')).toContainText('OVER', { timeout: 6000 })

        await sendChatMessage(page, 'ja tämä')

        await expect(page.getByTestId('user-message')).toContainText('ja tämä')
        await expect(page.getByTestId('assistant-message')).toContainText('OVER', { timeout: 6000 })

        page.on('dialog', (dialog) => dialog.accept())
        await page.getByTestId('empty-conversation-button').click()

        await expect(page.getByTestId('user-message')).not.toBeVisible()
        await expect(page.getByTestId('assistant-message')).not.toBeVisible()
      })

      test('Can save as email', async ({ page }) => {
        await acceptDisclaimer(page)
        await useMockModel(page)

        await sendChatMessage(page, 'tää tyhjennetään')

        await closeSendPreference(page)

        await expect(page.getByTestId('user-message')).toContainText('tää tyhjennetään')
        await expect(page.getByTestId('assistant-message')).toContainText('OVER', { timeout: 6000 })

        await page.getByTestId('email-button').click()

        await expect(page.getByText('Email sent')).toBeVisible()
      })

      test('Custom system prompt can be changed', async ({ page }) => {
        await acceptDisclaimer(page)
        await useMockModel(page)
        await page.getByTestId('settings-button').click()

        const systemPrompt = 'mocktest this is the system prompt'
        await page.getByTestId('assistant-instructions-input').fill(systemPrompt)
        await page.getByTestId('settings-ok-button').click()

        await sendChatMessage(page, 'I can send anything now, the model just echoes the system prompt since it begins with mocktest.')
        await closeSendPreference(page)

        await expect(page.getByTestId('assistant-message')).toContainText(systemPrompt)
      })

      test('Default temperature is 0.5 and can adjust temperature', async ({ page }) => {
        await acceptDisclaimer(page)
        await useMockModel(page)

        await sendChatMessage(page, 'temperature')
        await closeSendPreference(page)
        await expect(page.getByTestId('assistant-message').first()).toContainText('Temperature: 0.5')

        await page.getByTestId('settings-button').click()

        const slider = page.getByRole('slider').first()
        // Move right 6 times
        for (let i = 0; i < 6; i++) {
          await slider.press('ArrowRight')
        }

        // Close settings
        await page.getByTestId('settings-ok-button').click()

        await sendChatMessage(page, 'temperature')
        await expect(page.getByTestId('assistant-message').last()).toContainText('Temperature: 1')
      })

      if (course) {
        test('Course chat RAG feature', async ({ page }) => {
          await acceptDisclaimer(page)
          await useMockModel(page)

          const ragName = `rag-${test.info().workerIndex}-${testConfig.role}`
          await page.locator('#rag-index-selector').first().click()
          await page.getByRole('menuitem', { name: ragName, exact: true }).click()

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
      }

      if (!course) {
        test('Every validModel is available in general chat', async ({ page }) => {
          await acceptDisclaimer(page)
          await page.getByTestId('model-selector').first().click()

          const modelNames = validModels.map((modelConfig) => (modelConfig.name + FREE_MODEL === modelConfig.name ? ' (free)' : ''))

          for (const name of modelNames) {
            await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
          }
        })
      }
    })
  })
})
