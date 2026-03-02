import { expect } from '@playwright/test'
import { teacherTest as test } from './fixtures'
import { acceptDisclaimer } from './utils/test-helpers'
import { TEST_COURSES } from '../src/shared/testData'

test.describe('Select course modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/courses')
    await acceptDisclaimer(page)
    await page.getByTestId('select-course-button').click()
  })

  test('shows three tabs', async ({ page }) => {
    await expect(page.getByTestId('view-active-courses')).toBeVisible()
    await expect(page.getByTestId('view-not-active-courses')).toBeVisible()
    await expect(page.getByTestId('view-ended-courses')).toBeVisible()
  })

  test('active tab shows active courses', async ({ page }) => {
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.OTE_SANDBOX.name.en })).toBeVisible()
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.TOSKA.name.en })).toBeVisible()
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.TEST_COURSE.name.en })).toBeVisible()
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.EXAMPLE_COURSE.name.en })).toBeHidden()
  })

  test('empty tab shows message to user', async ({ page }) => {
    await page.getByTestId('view-not-active-courses').click()
    // message source: en.json course.noResults
    await expect(page.getByText('You do not have courses where CurreChat is enabled')).toBeVisible()
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.OTE_SANDBOX.name.en })).toBeHidden()
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.TOSKA.name.en })).toBeHidden()
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.TEST_COURSE.name.en })).toBeHidden()
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.EXAMPLE_COURSE.name.en })).toBeHidden()
  })

  test('past courses tab shows a past course', async ({ page }) => {
    await page.getByTestId('view-ended-courses').click()
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.EXAMPLE_COURSE.name.en })).toBeVisible()
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.OTE_SANDBOX.name.en })).toBeHidden()
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.TOSKA.name.en })).toBeHidden()
    await expect(page.getByRole('rowheader', { name: TEST_COURSES.TEST_COURSE.name.en })).toBeHidden()
  })

  test.only('sorting persists through changing tabs', async ({ page }) => {
    await page.getByTestId('sort-by-name').first().click()
    await page.getByTestId('view-not-active-courses').click()
    await page.getByTestId('view-active-courses').click()
    await expect(page.getByRole('rowheader').first()).toHaveText(TEST_COURSES.TOSKA.name.en)
  })
})
