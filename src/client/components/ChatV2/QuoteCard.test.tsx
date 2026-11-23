import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

import en from '../../locales/en.json'
import { QuoteCard } from './QuoteCard'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const renderCard = (quote: { path: string; heading?: string; text: string }) =>
  render(
    <I18nextProvider i18n={i18n}>
      <QuoteCard quote={{ kind: 'text', ...quote }} />
    </I18nextProvider>,
  )

/** happy-dom does no layout: make the clamped text report more content than fits. */
const overflowing = (isOverflowing: boolean) => {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(isOverflowing ? 300 : 100)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100)
}

describe('QuoteCard', () => {
  test('shows the file name and heading above the quoted text', () => {
    renderCard({ path: 'Course/week3/notes.md', heading: '2.3 Eigenvalues', text: 'An eigenvector keeps its direction.' })
    expect(screen.getByTestId('quote-card-source').textContent).toBe('📄 notes.md · 2.3 Eigenvalues')
    expect(screen.getByTestId('quote-card-text').tagName).toBe('BLOCKQUOTE')
    expect(screen.getByTestId('quote-card-text').textContent).toBe('An eigenvector keeps its direction.')
  })

  test('without a heading shows only the file name', () => {
    renderCard({ path: 'notes.txt', text: 'Plain' })
    expect(screen.getByTestId('quote-card-source').textContent).toBe('📄 notes.txt')
  })

  test('clamps long text and offers Show more and Show less', () => {
    overflowing(true)
    renderCard({ path: 'notes.md', text: 'line\n'.repeat(20) })
    const text = screen.getByTestId('quote-card-text')
    expect(text.getAttribute('data-clamped')).toBe('true')

    const toggle = screen.getByRole('button', { name: 'Show more' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.getAttribute('aria-controls')).toBe(text.id)

    fireEvent.click(toggle)
    expect(text.getAttribute('data-clamped')).toBe('false')
    expect(screen.getByRole('button', { name: 'Show less' }).getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Show less' }))
    expect(text.getAttribute('data-clamped')).toBe('true')
  })

  test('short text has no Show more', () => {
    overflowing(false)
    renderCard({ path: 'notes.md', text: 'short' })
    expect(screen.queryByRole('button')).toBe(null)
  })
})
