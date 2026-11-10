import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { ReasoningPart } from '../../../shared/agentChat'
import en from '../../locales/en.json'
import { ThinkingBlock } from './ThinkingBlock'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(cleanup)

const renderBlock = (part: ReasoningPart) =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThinkingBlock part={part} />
    </I18nextProvider>,
  )

const streaming: ReasoningPart = { type: 'reasoning', text: 'Reading the question', startedAt: 1000 }
const done: ReasoningPart = { type: 'reasoning', text: 'Reading the question', durationMs: 3400 }

describe('ThinkingBlock', () => {
  test('is collapsed by default while the model thinks, with a labelled toggle button', () => {
    renderBlock(streaming)

    const button = screen.getByRole('button', { name: 'Thinking…' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.hasAttribute('aria-controls')).toBe(false)
    expect(screen.queryByText('Reading the question')).toBeNull()
  })

  test('is collapsed by default once done, and says how long the model thought', () => {
    renderBlock(done)

    const button = screen.getByRole('button', { name: 'Thought for 3 s' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Reading the question')).toBeNull()
  })

  test('opens to show the reasoning, which keeps growing while it streams, and closes again', async () => {
    const { rerender } = renderBlock(streaming)
    const button = screen.getByRole('button', { name: 'Thinking…' })

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    const content = screen.getByTestId('thinking-content')
    expect(button.getAttribute('aria-controls')).toBe(content.id)
    expect(content.textContent).toBe('Reading the question')

    rerender(
      <I18nextProvider i18n={i18n}>
        <ThinkingBlock part={{ ...streaming, text: 'Reading the question and planning' }} />
      </I18nextProvider>,
    )
    expect(screen.getByTestId('thinking-content').textContent).toBe('Reading the question and planning')

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    // The content unmounts once the collapse transition has finished.
    await act(() => new Promise((resolve) => setTimeout(resolve, 500)))
    expect(screen.queryByTestId('thinking-content')).toBeNull()
  })

  test('a very short thought still reads at least one second', () => {
    renderBlock({ type: 'reasoning', text: 'x', durationMs: 120 })
    expect(screen.getByRole('button', { name: 'Thought for 1 s' })).toBeTruthy()
  })
})
