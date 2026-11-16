import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import type { ValidModelName } from '@config'

// vitest's `define` turns an unset DEFAULT_MODEL into the string 'undefined', which src/config.ts rejects
vi.hoisted(() => {
  delete process.env.DEFAULT_MODEL
})

const currentUser = { user: { isAdmin: false } }
const promptState = { activePrompt: undefined }
vi.mock('../../hooks/useCurrentUser', () => ({ default: () => currentUser }))
vi.mock('./PromptState', () => ({ usePromptState: () => promptState }))

import en from '../../locales/en.json'
import ModelSelector from './ModelSelector'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(cleanup)

const openSelector = ({ currentModel = 'gpt-6-luna' as ValidModelName, isTokenLimitExceeded = false, setModel = vi.fn() } = {}) => {
  render(
    <I18nextProvider i18n={i18n}>
      <ModelSelector currentModel={currentModel} setModel={setModel} isTokenLimitExceeded={isTokenLimitExceeded} />
    </I18nextProvider>,
  )
  fireEvent.click(screen.getByTestId('model-selector'))
  return { menu: screen.getByRole('menu'), setModel }
}

describe('ModelSelector', () => {
  test('models tagged more are hidden behind "More models"', () => {
    const { menu, setModel } = openSelector()

    expect(within(menu).queryByTestId('gpt-6-luna-option')).toBeTruthy()
    expect(within(menu).queryByTestId('gpt-5.5-option')).toBeNull()
    expect(within(menu).queryByTestId('gpt-5-mini-option')).toBeNull()

    const toggle = within(menu).getByTestId('more-models-toggle')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(within(menu).getByTestId('gpt-5.5-option'))
    expect(setModel).toHaveBeenCalledWith('gpt-5.5')
  })

  test('"More models" is keyboard operable and the revealed models are reachable with arrow keys', () => {
    const { menu } = openSelector()
    const toggle = within(menu).getByTestId('more-models-toggle')

    toggle.focus()
    fireEvent.keyDown(toggle, { key: 'Enter' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.textContent).toContain('More models')

    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(document.activeElement?.getAttribute('data-testid')).toBe('gpt-5-mini-option')
    expect(document.activeElement?.getAttribute('role')).toBe('menuitemradio')
  })

  test('section starts expanded when a model under it is selected', () => {
    const { menu } = openSelector({ currentModel: 'gpt-5.5' })

    expect(within(menu).getByTestId('more-models-toggle').getAttribute('aria-expanded')).toBe('true')
    expect(within(menu).getByTestId('gpt-5.5-option').getAttribute('aria-checked')).toBe('true')
  })

  test('only free models under "More models" are offered when the token limit is exceeded', () => {
    const { menu } = openSelector({ isTokenLimitExceeded: true })
    fireEvent.click(within(menu).getByTestId('more-models-toggle'))

    expect(within(menu).queryByTestId('gpt-5-mini-option')).toBeTruthy()
    expect(within(menu).queryByTestId('gpt-5.5-option')).toBeNull()
  })
})
