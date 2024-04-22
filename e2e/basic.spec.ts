import { test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('Can visit home', async ({ page }) => {
  // Assert that the page has text "Contact support:"
  await page.getByText('Contact support:').isVisible()

  await page.screenshot({ path: 'screenshots/home.png' })
})

test('Can prompt', async ({ page }) => {
  await page.getByText('gpt-4', { exact: true }).click()
  await page.getByRole('option', { name: 'mock' }).click()
  await page.getByPlaceholder('Kirjoita viestisi tähän').click()
  await page.getByPlaceholder('Kirjoita viestisi tähän').fill('Morjenstapäivää')
  await page.getByRole('button', { name: 'Lähetä' }).click()
  await page.getByText('This is completion 0 This is').click()
})
