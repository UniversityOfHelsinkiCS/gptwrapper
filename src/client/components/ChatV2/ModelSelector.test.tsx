import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
const embedded = { value: false }
vi.mock('../../hooks/useCurrentUser', () => ({ default: () => currentUser }))
vi.mock('./PromptState', () => ({ usePromptState: () => promptState }))
vi.mock('../../contexts/EmbeddedContext', () => ({ useIsEmbedded: () => embedded.value }))

import en from '../../locales/en.json'
import ModelSelector from './ModelSelector'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(() => {
  cleanup()
  embedded.value = false
})

const openSelector = ({ currentModel = 'gpt-6-luna' as ValidModelName, isTokenLimitExceeded = false, isMobile = false, setModel = vi.fn() } = {}) => {
  render(
    <I18nextProvider i18n={i18n}>
      <ModelSelector currentModel={currentModel} setModel={setModel} isTokenLimitExceeded={isTokenLimitExceeded} isMobile={isMobile} />
    </I18nextProvider>,
  )
  fireEvent.click(screen.getByTestId('model-selector'))
  const menu = screen.getByRole('menu', { name: 'Language model', hidden: true })
  return { menu, toggle: within(menu).getByTestId('more-models-toggle'), setModel }
}

const getSideMenu = () => screen.getByRole('menu', { name: 'More models' })

describe('ModelSelector on a wide screen: "More models" opens a menu next to the featured one', () => {
  test('models tagged more are only in the side menu', () => {
    const { menu, toggle, setModel } = openSelector()

    expect(within(menu).queryByTestId('gpt-6-luna-option')).toBeTruthy()
    expect(screen.queryByTestId('gpt-5.5-option')).toBeNull()

    expect(toggle.getAttribute('aria-haspopup')).toBe('menu')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    const sideMenu = getSideMenu()
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)?.contains(sideMenu)).toBe(true)
    expect(within(menu).queryByTestId('gpt-5.5-option')).toBeNull()

    fireEvent.click(within(sideMenu).getByTestId('gpt-5.5-option'))
    expect(setModel).toHaveBeenCalledWith('gpt-5.5')
  })

  test('ArrowRight opens the side menu with focus inside it, ArrowLeft closes it', () => {
    const { toggle } = openSelector()

    toggle.focus()
    fireEvent.keyDown(toggle, { key: 'ArrowRight' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(getSideMenu().contains(document.activeElement)).toBe(true)
    expect(document.activeElement?.getAttribute('role')).toBe('menuitemradio')

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  // The side menu lets the pointer through (pointer-events: none), so clicks outside its panel land on the featured menu's backdrop
  const getFeaturedBackdrop = (menu: HTMLElement) => menu.closest('.MuiModal-root')!.querySelector<HTMLElement>('.MuiBackdrop-root')!

  test('a click outside both menus closes both at once', async () => {
    const { menu, toggle } = openSelector()
    fireEvent.click(toggle)

    fireEvent.click(getFeaturedBackdrop(menu), { clientX: 5000, clientY: 5000 })

    await waitFor(() => expect(screen.getByTestId('model-selector').getAttribute('aria-expanded')).toBe('false'))
  })

  test('a featured model can be picked with one click while the side menu is open', () => {
    const { menu, toggle, setModel } = openSelector()
    fireEvent.click(toggle)

    fireEvent.click(within(menu).getByTestId('gpt-6.1-sol-option'))
    expect(setModel).toHaveBeenCalledWith('gpt-6.1-sol')
    expect(screen.getByTestId('model-selector').getAttribute('aria-expanded')).toBe('false')
  })

  test('the backdrop shows a pointer cursor over the pill, since a click there closes the menus', () => {
    const { menu, toggle } = openSelector()
    fireEvent.click(toggle)

    const pillRect = screen.getByTestId('model-selector').getBoundingClientRect()
    const backdrop = getFeaturedBackdrop(menu)
    fireEvent.mouseMove(backdrop, { clientX: pillRect.left, clientY: pillRect.top })
    expect(backdrop.style.cursor).toBe('pointer')
    fireEvent.mouseMove(backdrop, { clientX: 5000, clientY: 5000 })
    expect(backdrop.style.cursor).toBe('')
  })

  test('Enter on "More models" opens the side menu', () => {
    const { toggle } = openSelector()

    toggle.focus()
    fireEvent.keyDown(toggle, { key: 'Enter' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  test('when the current model is in More models, the side menu opens too, with focus on that model', async () => {
    const { toggle } = openSelector({ currentModel: 'gpt-5.5' })

    expect(toggle.getAttribute('aria-label')).toBe('More models, GPT-5.5 selected')
    // opens as the featured menu starts its grow animation
    const sideMenu = await screen.findByRole('menu', { name: 'More models' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    const current = within(sideMenu).getByTestId('gpt-5.5-option')
    expect(current.getAttribute('aria-checked')).toBe('true')
    expect(document.activeElement).toBe(current)

    fireEvent.keyDown(current, { key: 'ArrowLeft' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  test('the side menu does not open by itself when the current model is featured', () => {
    const { toggle } = openSelector()

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu', { name: 'More models' })).toBeNull()
  })

  test('only free models are in the side menu when the token limit is exceeded', () => {
    const { toggle } = openSelector({ isTokenLimitExceeded: true })
    fireEvent.click(toggle)

    const sideMenu = getSideMenu()
    expect(within(sideMenu).queryByTestId('gpt-5-mini-option')).toBeTruthy()
    expect(within(sideMenu).queryByTestId('gpt-5.5-option')).toBeNull()
  })
})

describe('ModelSelector on a narrow screen or embedded: "More models" expands inline', () => {
  test('the section expands inside the featured menu, without a second menu', () => {
    const { menu, toggle } = openSelector({ isMobile: true })

    expect(toggle.getAttribute('aria-haspopup')).toBeNull()
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(within(menu).queryByTestId('gpt-5.5-option')).toBeTruthy()
    expect(screen.getAllByRole('menu')).toHaveLength(1)
  })

  test('the section starts expanded when the current model is in it', () => {
    const { menu, toggle } = openSelector({ currentModel: 'gpt-5.5', isMobile: true })

    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(within(menu).getByTestId('gpt-5.5-option').getAttribute('aria-checked')).toBe('true')
  })

  test('embedded mode expands inline even on a wide screen', () => {
    embedded.value = true
    const { menu, toggle } = openSelector()

    fireEvent.click(toggle)
    expect(within(menu).queryByTestId('gpt-5.5-option')).toBeTruthy()
    expect(screen.getAllByRole('menu')).toHaveLength(1)
  })
})
