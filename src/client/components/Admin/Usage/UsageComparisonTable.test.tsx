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

const comparison = { rows: [row('low', 90, 10), row('over', 20, 130), row('bonus', 50, 100), row('mid', 5, 60)], isLoading: false }
vi.mock('../../../hooks/useUsageComparison', () => ({ default: () => comparison }))

import en from '../../../locales/en.json'
import UsageComparisonTable from './UsageComparisonTable'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(cleanup)

const renderTable = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <UsageComparisonTable />
    </I18nextProvider>,
  )

const bodyRows = () => screen.getAllByRole('row').slice(1)
const usernames = () => bodyRows().map((tableRow) => within(tableRow).getByRole('rowheader').textContent?.replace('F L', ''))

describe('UsageComparisonTable', () => {
  test('sorts by the budget % descending by default', () => {
    renderTable()

    expect(usernames()).toEqual(['over', 'bonus', 'mid', 'low'])
    expect(screen.getByRole('columnheader', { name: en.admin.costPercent }).getAttribute('aria-sort')).toBe('descending')
  })

  test('toggles the budget % order and sorts by the token %', () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: en.admin.costPercent }))
    expect(usernames()).toEqual(['low', 'mid', 'bonus', 'over'])
    expect(screen.getByRole('columnheader', { name: en.admin.costPercent }).getAttribute('aria-sort')).toBe('ascending')

    fireEvent.click(screen.getByRole('button', { name: en.admin.tokenPercent }))
    expect(usernames()).toEqual(['low', 'bonus', 'over', 'mid'])
    expect(screen.getByRole('columnheader', { name: en.admin.tokenPercent }).getAttribute('aria-sort')).toBe('descending')
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
