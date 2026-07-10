import { expect } from '@playwright/test'
import { teacherTest as test } from './fixtures'
import { acceptDisclaimer } from './utils/test-helpers'

/**
 * Each worker gets its own Closed course seeded via reset-test-data's opt-in
 * `seedActivationCourse` flag, so the activation toggle can mutate usageLimit
 * without racing other workers or leaking into other specs.
 */
test.describe('Course management (CoursePreview)', () => {
  test.beforeEach(async ({ page }) => {
    const testUserIdx = test.info().workerIndex

    // Seed the per-worker activation course + known student on top of the default reset.
    await page.request.post('/api/test/reset-test-data', {
      data: { testUserIdx, testUserRole: 'teacher', seedActivationCourse: true },
    })

    // window.confirm on activate/deactivate — always accept.
    page.on('dialog', (dialog) => dialog.accept())

    await page.goto('/general')
    await acceptDisclaimer(page)
  })

  const openActivationCourse = async (page: import('@playwright/test').Page, testUserIdx: number) => {
    await page.getByTestId('choose-prompt-button').click()
    await page.getByTestId(`show-course-info-activation-test-${testUserIdx}-button`).click()
  }

  test('teacher can activate and deactivate a course', async ({ page }) => {
    const testUserIdx = test.info().workerIndex
    await openActivationCourse(page, testUserIdx)

    const statusChip = page.getByTestId('course-status-chip')

    // Seeded Closed.
    await expect(statusChip).toHaveAttribute('data-active', 'false')

    // Activate -> becomes active.
    await page.getByTestId('course-activate-button').click()
    await expect(statusChip).toHaveAttribute('data-active', 'true')

    // Deactivate -> back to closed.
    await page.getByTestId('course-deactivate-button').click()
    await expect(statusChip).toHaveAttribute('data-active', 'false')
  })

  test('student table shows the enrolled student', async ({ page }) => {
    const testUserIdx = test.info().workerIndex
    await openActivationCourse(page, testUserIdx)

    const studentsTable = page.getByTestId('students-table')
    await expect(studentsTable).toBeVisible()
    await expect(studentsTable).toContainText('Testiopiskelija')
    await expect(studentsTable).toContainText(`TESTSTUD-${testUserIdx}`)
  })
})
