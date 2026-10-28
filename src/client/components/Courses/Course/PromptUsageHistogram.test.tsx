import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test } from 'vitest'

import en from '../../../locales/en.json'
import PromptUsageHistogram from './PromptUsageHistogram'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    resources: { en },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })
})
afterEach(() => cleanup())

const activityPeriod = { startDate: '2026-09-01', endDate: '2026-12-31' }

const promptUsages = [
  { promptId: 'p-1', promptName: 'Tutor', date: '2026-09-01', totalTokens: 100, messageCount: 1 },
  { promptId: null, promptName: null, date: '2026-09-01', totalTokens: 20, messageCount: 1 },
  { promptId: 'p-1', promptName: 'Tutor', date: '2026-09-02', totalTokens: 300, messageCount: 2 },
]

const renderHistogram = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <PromptUsageHistogram promptUsages={promptUsages} activityPeriod={activityPeriod} />
    </I18nextProvider>,
  )

describe('PromptUsageHistogram', () => {
  test('shows the data as a table when the switch is turned on', () => {
    renderHistogram()

    expect(screen.queryByRole('table')).toBeNull()

    fireEvent.click(screen.getByRole('switch', { name: 'Show as table' }))

    const table = screen.getByRole('table', { name: 'Token usage per prompt' })
    const rows = within(table).getAllByRole('row')
    const cellTexts = (row: HTMLElement) => Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent)

    expect(cellTexts(rows[0])).toEqual(['Date', 'Tutor', 'Custom prompt', 'Total'])
    expect(cellTexts(rows[1])).toEqual(['1.9.', '100', '20', '120'])
    expect(cellTexts(rows[2])).toEqual(['2.9.', '300', '0', '300'])
    expect(cellTexts(rows[3])).toEqual(['Total', '400', '20', '420'])
  })
})
