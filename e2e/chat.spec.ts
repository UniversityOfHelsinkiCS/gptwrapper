import { expect } from '@playwright/test'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'
import { TestByRole } from './fixtures'
import { FREE_MODEL, validModels } from '../src/config'

// Matrix of tests
const testMatrix: { role: keyof typeof TestByRole; courses: (string | undefined)[] }[] = [
  { role: 'student', courses: ['test-course-course-id'] },
  { role: 'teacher', courses: ['test-course-course-id', undefined] },
  // { role: 'admin', courses: ['test-course-course-id', undefined] },
]

testMatrix.forEach((testConfig) => {
  const test = TestByRole[testConfig.role]

  testConfig.courses.forEach((course) => {
    test.describe(`${course ? `Course` : 'General'} chat test for ${testConfig.role}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`/${course || ''}`)
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

        await sendChatMessage(page, 'say minttujam')

        await closeSendPreference(page)

        await expect(page.getByTestId('user-message')).toContainText('say minttujam')
        await expect(page.getByTestId('assistant-message')).toContainText('minttujam')

        await sendChatMessage(page, 'say minttujam2')

        await expect(page.getByTestId('user-message').nth(1)).toContainText('say minttujam2')
        await expect(page.getByTestId('assistant-message').nth(1)).toContainText('minttujam2')

        await page.getByTestId('new-conversation-button').click()
        await page.getByTestId('submit-confirm-reset').click()

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

      test.skip('Can download as file', async ({ page }) => {
        await acceptDisclaimer(page)
        await useMockModel(page)

        await sendChatMessage(page, 'test download')

        await closeSendPreference(page)

        await expect(page.getByTestId('user-message')).toContainText('test download')
        await expect(page.getByTestId('assistant-message')).toContainText('OVER', { timeout: 6000 })

        // Set up download handler
        const downloadPromise = page.waitForEvent('download')
        await page.getByTestId('download-button').click()

        // Verify download was triggered
        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(/currechat-discussion-\d{4}-\d{2}-\d{2}-\d{6}\.md/)

        await expect(page.getByText('File downloaded')).toBeVisible()
      })

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
