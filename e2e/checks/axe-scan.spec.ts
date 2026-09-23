import { test, expect } from '@playwright/test'
import { scan, writeAxeReport } from '../axe/axe_utils'

test.describe('axe wcag scan', () => {
  test.afterAll(writeAxeReport)

  test('scan first load', async ({ page }, testInfo) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await scan(page, testInfo.title)
  })

  test('scan prompt modal', async ({ page }, testInfo) => {
    await page.goto('/general')

    await page.getByTestId('choose-prompt-button').click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await scan(page, testInfo.title)
  })

  test('scan global menu', async ({ page }, testInfo) => {
    await page.goto('/general')

    await page.getByTestId('global-menu-button').click()
    const modal = page.getByRole('menu')
    await expect(modal).toBeVisible()
    await scan(page, testInfo.title)
  })
})
