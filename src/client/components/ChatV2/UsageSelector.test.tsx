import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import type { CostUserStatus, TokenUserStatus } from '@shared/usage'

const usages = vi.hoisted(() => ({ calls: 0 }))

// hook results must be stable references
vi.mock('../../hooks/useUserUsage', () => {
  const result = {
    usageInfo: {
      limit: 100_000,
      courses: [
        { courseId: 'general', name: { en: 'General chat', fi: 'Yleinen chat' }, usage: 42_000, limit: 100_000 },
        { courseId: 'otm-1', name: { en: 'Biology', fi: 'Biologia' }, usage: 1000, limit: 50_000 },
      ],
    },
    isLoading: false,
    refetch: () => {},
  }
  return {
    default: () => {
      usages.calls += 1
      return result
    },
  }
})
vi.mock('./PromptState', () => {
  const state = { handleChangePrompt: () => {} }
  return { usePromptState: () => state }
})

import en from '../../locales/en.json'
import fi from '../../locales/fi.json'
import UsageSelector from './UsageSelector'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en, fi }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(async () => {
  cleanup()
  usages.calls = 0
  await i18n.changeLanguage('en')
})

const costStatus = (usage: number, overrides: Partial<CostUserStatus> = {}): CostUserStatus => ({
  mode: 'cost',
  usage,
  limit: 5,
  budget: {
    limit: 5,
    base: 2.5,
    bonuses: [
      { courseId: 'otm-1', name: { en: 'Biology', fi: 'Biologia', sv: 'Biologi' }, percent: 100 },
      { courseId: 'otm-2', name: { en: 'Chemistry', fi: 'Kemia', sv: 'Kemi' }, percent: 0 },
    ],
  },
  resetsAt: '2026-11-23T00:01:00.000Z',
  ...overrides,
})

const renderSelector = (userStatus?: CostUserStatus | TokenUserStatus) =>
  render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <UsageSelector userStatus={userStatus} />
      </I18nextProvider>
    </MemoryRouter>,
  )

const pill = () => screen.getByTestId('usage-selector')

describe('UsageSelector under cost enforcement', () => {
  test('shows the weekly budget percentage on the pill', () => {
    renderSelector(costStatus(2))

    expect(pill().textContent).toBe('Usage40%of your weekly budget used')
    expect(pill().textContent).toContain('40%')
  })

  test('shows the real percentage over 100%', () => {
    renderSelector(costStatus(6.5))

    expect(pill().textContent).toContain('130%')
  })

  test('lists the base budget and the bonus courses with their percent and the reset time', () => {
    renderSelector(costStatus(2))
    fireEvent.click(pill())

    const dialog = screen.getByRole('dialog', { name: 'Your weekly budget' })
    const items = Array.from(screen.getByTestId('usage-budget-composition').querySelectorAll('li')).map((li) => li.textContent)
    expect(items).toEqual(['Base budget', 'Biology (+100%)'])
    expect(dialog.textContent).toContain('40% used')

    const resetsAt = new Date('2026-11-23T00:01:00.000Z').toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })
    expect(screen.getByTestId('usage-budget-resets').textContent).toBe(`Resets ${resetsAt}`)
  })

  test('shows course names in the UI language', async () => {
    await i18n.changeLanguage('fi')
    renderSelector(costStatus(2))
    fireEvent.click(pill())

    expect(screen.getByTestId('usage-budget-composition').textContent).toContain('Biologia (+100%)')
  })

  test('shows one gauge and no euros', () => {
    renderSelector(costStatus(2))
    fireEvent.click(pill())

    expect(document.body.textContent).not.toContain('€')
    expect(document.body.textContent).not.toContain('2.5')
    expect(document.querySelectorAll('svg text').length).toBe(1)
  })

  test('does not fetch the per-course token usage', () => {
    renderSelector(costStatus(2))

    expect(usages.calls).toBe(0)
  })
})

describe('UsageSelector under token enforcement', () => {
  test('renders nothing before the status has loaded', () => {
    renderSelector(undefined)

    expect(screen.queryByTestId('usage-selector')).toBeNull()
  })

  test('shows the per-course token gauges as before', () => {
    renderSelector({ mode: 'tokens', usage: 42_000, limit: 100_000 })

    expect(pill().getAttribute('aria-label')).toBeNull()
    expect(pill().getAttribute('aria-haspopup')).toBe('true')
    expect(pill().textContent).toBe('Your token usageGeneral chat42%')

    fireEvent.click(pill())
    const items = screen.getAllByRole('menuitemradio').map((item) => item.getAttribute('aria-label'))
    expect(items).toEqual(['General chat, 42k / 100k tokens, 42% of tokens used', 'Biology, 1k / 50k tokens, 2% of tokens used'])
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
