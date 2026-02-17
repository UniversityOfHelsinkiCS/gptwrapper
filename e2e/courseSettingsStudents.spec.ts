import { expect } from '@playwright/test'
import { teacherTest as test } from './fixtures'
import { acceptDisclaimer } from './utils/test-helpers'

test.describe('Course Settings - Students Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-course-course-id')
    await acceptDisclaimer(page)
    await page.getByTestId('course-settings-button').click()
    await page.getByTestId('studentsTab').click()
  })

  test('Students tab shows statistics heading and metrics', async ({ page }) => {
    await expect(page.getByTestId('students-stats-container')).toBeVisible()
    await expect(page.getByTestId('statistics-heading')).toBeVisible()
    await expect(page.getByTestId('statistics-heading')).toContainText('Statistics')
    await expect(page.getByTestId('average-token-usage')).toBeVisible()
    await expect(page.getByTestId('usage-percentage')).toBeVisible()
  })

  test('Students table displays correctly with headers', async ({ page }) => {
    const table = page.getByTestId('students-table')
    await expect(table).toBeVisible()

    await expect(page.getByText('Student number')).toBeVisible()
    await expect(page.getByText('Last name')).toBeVisible()
    await expect(page.getByText('First names')).toBeVisible()
    await expect(page.getByTestId('sort-by-usage')).toBeVisible()
    await expect(page.getByTestId('sort-by-total-usage')).toBeVisible()
  })

  test('Can sort students by last name', async ({ page }) => {
    await expect(page.getByTestId('students-table')).toBeVisible()

    const sortByLastName = page.getByTestId('sort-by-last-name')
    await expect(sortByLastName).toBeVisible()

    await sortByLastName.click()
    await expect(sortByLastName).toBeVisible()

    await sortByLastName.click()
    await expect(sortByLastName).toBeVisible()
  })

  test('Can sort students by usage', async ({ page }) => {
    await expect(page.getByTestId('students-table')).toBeVisible()

    const sortByUsage = page.getByTestId('sort-by-usage')
    await expect(sortByUsage).toBeVisible()

    await sortByUsage.click()
    await expect(sortByUsage).toBeVisible()

    await sortByUsage.click()
    await expect(sortByUsage).toBeVisible()
  })

  test('Can sort students by total usage', async ({ page }) => {
    await expect(page.getByTestId('students-table')).toBeVisible()

    const sortByTotalUsage = page.getByTestId('sort-by-total-usage')
    await expect(sortByTotalUsage).toBeVisible()

    await sortByTotalUsage.click()
    await expect(sortByTotalUsage).toBeVisible()

    await sortByTotalUsage.click()
    await expect(sortByTotalUsage).toBeVisible()
  })

  test('Student rows display correct data columns', async ({ page }) => {
    await expect(page.getByTestId('students-table')).toBeVisible()

    const tableBody = page.getByTestId('students-table-body')
    await expect(tableBody).toBeVisible()

    const rows = tableBody.locator('tr')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      const firstRow = rows.first()
      const cells = firstRow.locator('td')
      expect(await cells.count()).toBeGreaterThanOrEqual(6)
    }
  })
})
