import { expect } from '@playwright/test'
import { acceptDisclaimer, closeSendPreference, sendChatMessage, useMockModel } from './utils/test-helpers'
import { studentTest, TestByRole } from './fixtures'
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
        await acceptDisclaimer(page)
      })

      test('Can select model', async ({ page }) => {
        await useMockModel(page)
      })

      test('One message works', async ({ page }) => {
        await useMockModel(page)

        await sendChatMessage(page, 'testinen morjens')

        await closeSendPreference(page)

        await expect(page.getByTestId('user-message')).toContainText('testinen morjens')
        await expect(page.getByTestId('assistant-message')).toContainText('You are calling mock endpoint for streaming mock data')
      })

      test('Multiple messages work', async ({ page }) => {
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
        await useMockModel(page)

        await sendChatMessage(page, 'tää tyhjennetään')

        await closeSendPreference(page)

        await expect(page.getByTestId('user-message')).toContainText('tää tyhjennetään')
        await expect(page.getByTestId('assistant-message')).toContainText('OVER', { timeout: 6000 })

        await page.getByTestId('email-button').click()

        await expect(page.getByText('Email sent')).toBeVisible()
      })

      test.skip('Can download as file', async ({ page }) => {
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

studentTest.describe('Thinking block', () => {
  studentTest('a reasoning answer shows a collapsed thinking block that opens and closes', async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
    await useMockModel(page)

    // The mock model streams reasoning chunks before answering for `think <answer>`
    await sendChatMessage(page, 'think The thought-through answer.')
    // While it streams the block says "Thinking…". The send preference popover hides the rest of the page from
    // the accessibility tree, so the streaming state is checked from the DOM.
    const block = page.getByTestId('thinking-block')
    await expect(block).toHaveAttribute('data-thinking', 'true')
    await expect(block).toContainText('Thinking…')
    await closeSendPreference(page)

    const answer = page.getByTestId('assistant-message')
    await expect(answer).toContainText('The thought-through answer.')
    const toggle = answer.getByRole('button', { name: /^Thought for \d+ s$/ })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(answer).not.toContainText('mock thinking')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(answer.getByTestId('thinking-content')).toContainText('Reading the question')
    await expect(answer.getByTestId('thinking-content')).toContainText('The user wants a mock answer after some mock thinking.')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(answer.getByTestId('thinking-content')).toHaveCount(0)
  })
})

studentTest.describe('Subagent card', () => {
  studentTest("a delegated task shows a collapsed subagent card with the subagent's own output nested in it", async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
    await useMockModel(page)

    // The mock model delegates `subagent <task>` to the mock subagent, which writes text and makes a lookup tool call
    await sendChatMessage(page, 'subagent Find the mock facts')
    await closeSendPreference(page)

    const answer = page.getByTestId('assistant-message')
    // The main agent answers with what the subagent found
    await expect(answer).toContainText('The mock lookup found 42 facts')

    const card = answer.getByTestId('subagent-card')
    await expect(card).toHaveAttribute('data-subagent-status', 'ok')
    await expect(card).toContainText('Task: Find the mock facts')
    const toggle = card.getByRole('button', { name: 'Subagent mock_subagent finished' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(answer).not.toContainText('Let me look that up.')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const content = card.getByTestId('subagent-content')
    await expect(content).toContainText('Let me look that up.')
    await expect(content.getByRole('group', { name: 'Tool mock_lookup' })).toHaveAttribute('data-tool-status', 'ok')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(content).toHaveCount(0)
  })
})

studentTest.describe('Quiz card', () => {
  studentTest.beforeEach(async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
    await useMockModel(page)
  })

  studentTest('answering a quiz shows the result at once, the agent replies, and the answer survives a reload', async ({ page }) => {
    // The mock model writes a lead-in and calls present_quiz for `quiz`; the turn ends at the quiz
    await sendChatMessage(page, 'quiz')
    await closeSendPreference(page)

    const answer = page.getByTestId('assistant-message').first()
    await expect(answer).toContainText("Let's check what you remember.")
    const card = answer.getByTestId('quiz-card')
    await expect(card).toHaveAttribute('data-quiz-state', 'open')
    await expect(card.getByRole('radiogroup', { name: 'Which of these numbers is a prime number?' })).toBeVisible()

    const submit = card.getByRole('button', { name: 'Submit answer' })
    await expect(submit).toBeDisabled()
    // Keyboard: the radios are one tab stop, arrow keys move the selection
    await card.getByRole('radio', { name: '4', exact: true }).focus()
    await page.keyboard.press('ArrowDown')
    await expect(card.getByRole('radio', { name: '7', exact: true })).toBeChecked()
    await card.getByRole('textbox', { name: 'Your reasoning (optional)' }).fill('It has no other divisors')
    await submit.click()

    await expect(card).toHaveAttribute('data-quiz-state', 'answered')
    await expect(card.getByTestId('quiz-result')).toHaveAttribute('data-quiz-outcome', 'correct')
    await expect(card.getByTestId('quiz-result')).toContainText('Correct!')
    await expect(card.getByTestId('quiz-result')).toContainText('7 is only divisible by 1 and itself')
    await expect(card.getByRole('radio', { name: /^7/ })).toBeDisabled()

    // The answer is sent as a user message and the agent continues
    await expect(page.getByTestId('user-message')).toHaveCount(1)
    await expect(page.getByTestId('assistant-message').nth(1)).toContainText('Thanks for answering the quiz! Result: correct.')

    await page.reload()
    const reloaded = page.getByTestId('quiz-card')
    await expect(reloaded).toHaveAttribute('data-quiz-state', 'answered')
    await expect(reloaded.getByRole('radio', { name: /^7/ })).toBeChecked()
    await expect(reloaded.getByTestId('quiz-result')).toContainText('Correct!')
    await expect(reloaded.getByRole('button', { name: 'Submit answer' })).toHaveCount(0)
  })

  studentTest('"I don\'t know" clears the other options in a multi-select quiz and is answered as not knowing', async ({ page }) => {
    await sendChatMessage(page, 'quiz multi')
    await closeSendPreference(page)

    const card = page.getByTestId('quiz-card')
    const group = card.getByRole('group', { name: 'Which of these numbers are even?' })
    await group.getByRole('checkbox', { name: '2', exact: true }).check()
    await group.getByRole('checkbox', { name: '4', exact: true }).check()
    await group.getByRole('checkbox', { name: "I don't know" }).check()
    await expect(group.getByRole('checkbox', { name: '2', exact: true })).not.toBeChecked()
    await expect(group.getByRole('checkbox', { name: '4', exact: true })).not.toBeChecked()

    const explanation = card.getByRole('textbox', { name: 'Your reasoning (optional)' })
    await expect(explanation).toHaveAttribute('placeholder', 'What part is unclear?')
    await explanation.fill('What does even mean?')
    await card.getByRole('button', { name: 'Submit answer' }).click()

    await expect(card.getByTestId('quiz-result')).toHaveAttribute('data-quiz-outcome', 'idk')
    await expect(card.getByTestId('quiz-result')).toContainText('No problem, here is the answer.')
    await expect(page.getByTestId('user-message')).toHaveCount(1)
    await expect(page.getByTestId('assistant-message').nth(1)).toContainText('Result: did not know.')
  })

  studentTest('regenerating the reply to an answer keeps the quiz answered, and a new quiz is open again', async ({ page }) => {
    await sendChatMessage(page, 'quiz')
    await closeSendPreference(page)

    const card = page.getByTestId('quiz-card')
    await card.getByRole('radio', { name: '4', exact: true }).check()
    // The mock model fails its reply to an answer whose explanation contains `fail`
    await card.getByRole('textbox', { name: 'Your reasoning (optional)' }).fill('fail this reply')
    await card.getByRole('button', { name: 'Submit answer' }).click()
    await expect(card.getByTestId('quiz-result')).toHaveAttribute('data-quiz-outcome', 'incorrect')

    const reply = page.getByTestId('assistant-message').nth(1)
    await expect(reply).toContainText('Error while generating response')
    await reply.getByRole('button', { name: 'Retry' }).click()
    // The retry resends the history up to the quiz answer (the deterministic mock fails it again): the quiz
    // stays answered (its answer message is hidden), and the reply is replaced, not added
    await expect(page.getByTestId('assistant-message').nth(1).getByRole('button', { name: 'Retry' })).toBeVisible()
    await expect(page.getByTestId('assistant-message')).toHaveCount(2)
    await expect(page.getByTestId('user-message')).toHaveCount(1)
    await expect(card).toHaveAttribute('data-quiz-state', 'answered')
    await expect(card.getByTestId('quiz-result')).toHaveAttribute('data-quiz-outcome', 'incorrect')

    // Asking again gives a new quiz (the mock reuses its call id), which is open while the old one stays answered
    await sendChatMessage(page, 'quiz')
    const cards = page.getByTestId('quiz-card')
    await expect(cards).toHaveCount(2)
    await expect(cards.nth(0)).toHaveAttribute('data-quiz-state', 'answered')
    await expect(cards.nth(1)).toHaveAttribute('data-quiz-state', 'open')
  })
})
