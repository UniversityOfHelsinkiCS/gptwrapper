import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import type { UsageComparisonRow } from '@shared/usage'

const row = (userId: string, tokenPercent: number, costPercent: number): UsageComparisonRow => ({
  userId,
  username: userId,
  firstNames: 'F',
  lastName: 'L',
  tokenUsage: tokenPercent * 1000,
  tokenLimit: 100_000,
  tokenPercent,
  cost: costPercent / 40,
  budget: { limit: 2.5, base: 2.5, bonuses: userId === 'bonus' ? [{ courseId: 'cur-1', name: { fi: 'Intro', en: 'Intro', sv: 'Intro' }, percent: 100 }] : [] },
  costPercent,
})

// The server sorts and pages, so the mock returns the rows as they are and records the requested params.
const comparison = { rows: [row('over', 20, 130), row('bonus', 50, 100), row('mid', 5, 60), row('low', 90, 10)], count: 120, isLoading: false }
const useUsageComparison = vi.fn((_params: unknown) => comparison)
vi.mock('../../../hooks/useUsageComparison', () => ({ default: (params: unknown) => useUsageComparison(params) }))

import en from '../../../locales/en.json'
import UsageComparisonTable from './UsageComparisonTable'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(() => {
  cleanup()
  useUsageComparison.mockClear()
})

const lastParams = () => useUsageComparison.mock.calls.at(-1)?.[0]

const renderTable = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <UsageComparisonTable />
    </I18nextProvider>,
  )

const bodyRows = () => screen.getAllByRole('row').slice(1)
const usernames = () => bodyRows().map((tableRow) => within(tableRow).getByRole('rowheader').textContent?.replace('F L', ''))

describe('UsageComparisonTable', () => {
  test('requests the first page by the budget % descending by default and shows the rows in the order received', () => {
    renderTable()

    expect(lastParams()).toEqual({ orderBy: 'costPercent', order: 'desc', limit: 50, offset: 0 })
    expect(usernames()).toEqual(['over', 'bonus', 'mid', 'low'])
    expect(screen.getByRole('columnheader', { name: en.admin.costPercent }).getAttribute('aria-sort')).toBe('descending')
  })

  test('toggles the budget % order and sorts by the token %', () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: en.admin.costPercent }))
    expect(lastParams()).toMatchObject({ orderBy: 'costPercent', order: 'asc' })
    expect(screen.getByRole('columnheader', { name: en.admin.costPercent }).getAttribute('aria-sort')).toBe('ascending')

    fireEvent.click(screen.getByRole('button', { name: en.admin.tokenPercent }))
    expect(lastParams()).toMatchObject({ orderBy: 'tokenPercent', order: 'desc' })
    expect(screen.getByRole('columnheader', { name: en.admin.tokenPercent }).getAttribute('aria-sort')).toBe('descending')
  })

  test('pages through the rows and goes back to the first page when the sort changes', () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    expect(lastParams()).toMatchObject({ limit: 50, offset: 50 })
    expect(screen.getByText('51–100 of 120')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: en.admin.tokenPercent }))
    expect(lastParams()).toMatchObject({ orderBy: 'tokenPercent', offset: 0 })
  })

  test('marks users at or over 100% of the budget with a text cue', () => {
    renderTable()

    const overBudget = bodyRows().filter((tableRow) => within(tableRow).queryByText(en.admin.overBudget))
    expect(overBudget.map((tableRow) => within(tableRow).getByRole('rowheader').textContent?.replace('F L', ''))).toEqual(['over', 'bonus'])
  })

  test('shows the budget composition', () => {
    renderTable()

    const bonusRow = bodyRows()[1]
    expect(within(bonusRow).getByText('Base €2.50')).toBeTruthy()
    expect(within(bonusRow).getByText('+100 % Intro')).toBeTruthy()
  })
})
