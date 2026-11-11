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
  test('models tagged more are hidden behind "More models", which opens a separate submenu', () => {
    const { menu, setModel } = openSelector()

    expect(within(menu).queryByTestId('gpt-6-luna-option')).toBeTruthy()
    expect(screen.queryByTestId('gpt-5.5-option')).toBeNull()
    expect(screen.queryByTestId('gpt-5-mini-option')).toBeNull()

    const toggle = within(menu).getByTestId('more-models-toggle')
    expect(toggle.getAttribute('aria-haspopup')).toBe('menu')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    const submenu = screen.getByRole('menu', { name: 'More models' })
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)?.contains(submenu)).toBe(true)
    expect(within(menu).queryByTestId('gpt-5.5-option')).toBeNull()

    fireEvent.click(within(submenu).getByTestId('gpt-5.5-option'))
    expect(setModel).toHaveBeenCalledWith('gpt-5.5')
  })

  test('ArrowRight opens the submenu with focus inside it, ArrowLeft closes it', () => {
    const { menu } = openSelector()
    const toggle = within(menu).getByTestId('more-models-toggle')

    toggle.focus()
    fireEvent.keyDown(toggle, { key: 'ArrowRight' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    const submenu = screen.getByRole('menu', { name: 'More models' })
    expect(submenu.contains(document.activeElement)).toBe(true)
    expect(document.activeElement?.getAttribute('role')).toBe('menuitemradio')

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  test('Enter on "More models" opens the submenu', () => {
    const { menu } = openSelector()
    const toggle = within(menu).getByTestId('more-models-toggle')

    toggle.focus()
    fireEvent.keyDown(toggle, { key: 'Enter' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  test('"More models" is marked selected when the current model is in it', () => {
    const { menu } = openSelector({ currentModel: 'gpt-5.5' })
    const toggle = within(menu).getByTestId('more-models-toggle')

    expect(toggle.className).toContain('Mui-selected')
    fireEvent.click(toggle)
    expect(screen.getByTestId('gpt-5.5-option').getAttribute('aria-checked')).toBe('true')
  })

  test('only free models under "More models" are offered when the token limit is exceeded', () => {
    const { menu } = openSelector({ isTokenLimitExceeded: true })
    fireEvent.click(within(menu).getByTestId('more-models-toggle'))

    const submenu = screen.getByRole('menu', { name: 'More models' })
    expect(within(submenu).queryByTestId('gpt-5-mini-option')).toBeTruthy()
    expect(within(submenu).queryByTestId('gpt-5.5-option')).toBeNull()
  })
})
