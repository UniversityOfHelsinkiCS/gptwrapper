import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { SubagentPart } from '../../../shared/agentChat'
import en from '../../locales/en.json'
import { SubagentCard } from './SubagentCard'

const NESTED = 'nested parts'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(cleanup)

const part = (overrides: Partial<SubagentPart> = {}): SubagentPart => ({
  type: 'subagent',
  callId: 'call_pdf',
  name: 'read_pdf',
  task: 'Find the exam date',
  status: 'running',
  parts: [],
  ...overrides,
})

const renderCard = (subagent: SubagentPart) =>
  render(
    <I18nextProvider i18n={i18n}>
      <SubagentCard part={subagent}>
        <p>{NESTED}</p>
      </SubagentCard>
    </I18nextProvider>,
  )

describe('SubagentCard progress', () => {
  test('shows the pages read_pdf is reading in a status line while it runs', () => {
    renderCard(part({ progress: { action: 'read', path: 'Course notes/book.pdf', startPage: 1, endPage: 5, totalPages: 40 } }))
    expect(screen.getByRole('status').textContent).toBe('Reading pages 1–5 of 40')
  })

  test('without a known total, or for a search, says what it does', () => {
    const { rerender } = renderCard(part({ progress: { action: 'read', path: 'Course notes/book.pdf', startPage: 3, endPage: 4 } }))
    expect(screen.getByRole('status').textContent).toBe('Reading pages 3–4')
    rerender(
      <I18nextProvider i18n={i18n}>
        <SubagentCard part={part({ progress: { action: 'search', path: 'Course notes/book.pdf', pattern: 'entropy' } })}>
          <p>{NESTED}</p>
        </SubagentCard>
      </I18nextProvider>,
    )
    expect(screen.getByRole('status').textContent).toBe('Searching Course notes/book.pdf for entropy')
  })

  test('has no status line once finished, and the nested parts stay collapsed until opened', () => {
    renderCard(part({ status: 'ok' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText(NESTED)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Subagent read_pdf finished' }))
    expect(screen.getByText(NESTED)).toBeTruthy()
  })
})
