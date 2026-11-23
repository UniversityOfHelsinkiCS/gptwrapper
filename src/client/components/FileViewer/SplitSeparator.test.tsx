import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import i18next from 'i18next'
import { useState } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import en from '../../locales/en.json'
import SplitSeparator, { clampSplit, DEFAULT_SPLIT, MAX_SPLIT, MIN_SPLIT, splitAfterKey, useSplitRatio, type SplitRange } from './SplitSeparator'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(() => {
  cleanup()
  localStorage.clear()
})

/** A split from x = 100 to x = 1100 (1000px), unless another range is given. */
const Harness = ({
  initial = 0.4,
  range = { start: 100, end: 1100 },
  onChange,
}: {
  initial?: number
  range?: SplitRange
  onChange?: (value: number) => void
}) => {
  const [value, setValue] = useState(initial)
  return (
    <SplitSeparator
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
      getRange={() => range}
      controls="chat-column"
    />
  )
}

const renderSeparator = (props: Parameters<typeof Harness>[0] = {}) => {
  render(
    <I18nextProvider i18n={i18n}>
      <Harness {...props} />
    </I18nextProvider>,
  )
  return screen.getByRole('separator', { name: 'Resize the chat and the file' })
}

describe('SplitSeparator', () => {
  test('is a labelled, focusable vertical separator with its value', () => {
    const separator = renderSeparator()
    expect(separator.tabIndex).toBe(0)
    expect(separator.getAttribute('aria-orientation')).toBe('vertical')
    expect(separator.getAttribute('aria-valuenow')).toBe('40')
    expect(separator.getAttribute('aria-valuemin')).toBe('20')
    expect(separator.getAttribute('aria-valuemax')).toBe('75')
    expect(separator.getAttribute('aria-valuetext')).toBe('Chat 40% of the width')
    expect(separator.getAttribute('aria-controls')).toBe('chat-column')
  })

  test('arrow keys move it by 5%, Home and End to the ends, other keys do nothing', () => {
    const separator = renderSeparator()
    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    expect(separator.getAttribute('aria-valuenow')).toBe('45')
    fireEvent.keyDown(separator, { key: 'ArrowUp' })
    expect(separator.getAttribute('aria-valuenow')).toBe('50')
    fireEvent.keyDown(separator, { key: 'ArrowLeft' })
    fireEvent.keyDown(separator, { key: 'ArrowDown' })
    expect(separator.getAttribute('aria-valuenow')).toBe('40')
    fireEvent.keyDown(separator, { key: 'End' })
    expect(separator.getAttribute('aria-valuenow')).toBe('75')
    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    expect(separator.getAttribute('aria-valuenow')).toBe('75')
    fireEvent.keyDown(separator, { key: 'Home' })
    expect(separator.getAttribute('aria-valuenow')).toBe('36') // 360px of 1000px
    fireEvent.keyDown(separator, { key: 'a' })
    expect(separator.getAttribute('aria-valuenow')).toBe('36')
  })

  test('keeps the chat at least 360px wide', () => {
    const separator = renderSeparator({ initial: 0.5, range: { start: 0, end: 800 } })
    for (let i = 0; i < 5; i++) fireEvent.keyDown(separator, { key: 'ArrowLeft' })
    expect(separator.getAttribute('aria-valuenow')).toBe('45') // 360 / 800
  })

  test('follows the pointer while dragged', () => {
    const onChange = vi.fn()
    const separator = renderSeparator({ onChange })
    fireEvent.pointerMove(separator, { clientX: 700 })
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.pointerDown(separator, { button: 0, clientX: 500, pointerId: 1 })
    fireEvent.pointerMove(separator, { clientX: 700 })
    expect(separator.getAttribute('aria-valuenow')).toBe('60')
    fireEvent.pointerMove(separator, { clientX: 150 })
    expect(separator.getAttribute('aria-valuenow')).toBe('36')
    fireEvent.pointerUp(separator, { pointerId: 1 })
    fireEvent.pointerMove(separator, { clientX: 700 })
    expect(separator.getAttribute('aria-valuenow')).toBe('36')
  })
})

describe('split ratio', () => {
  test('clampSplit keeps the ratio in range', () => {
    expect(clampSplit(0.1)).toBe(MIN_SPLIT)
    expect(clampSplit(0.9)).toBe(MAX_SPLIT)
    expect(clampSplit(0.3, 2000)).toBe(0.3)
    expect(clampSplit(0.3, 1000)).toBe(0.36)
    expect(clampSplit(0.3, 300)).toBe(MAX_SPLIT)
    expect(splitAfterKey('Enter', 0.4)).toBe(null)
  })

  test('is remembered, and a bad stored value falls back to the default', () => {
    const first = renderHook(() => useSplitRatio())
    expect(first.result.current[0]).toBe(DEFAULT_SPLIT)
    act(() => first.result.current[1](0.55))
    expect(first.result.current[0]).toBe(0.55)
    expect(renderHook(() => useSplitRatio()).result.current[0]).toBe(0.55)

    localStorage.setItem('file-viewer-split', 'nonsense')
    expect(renderHook(() => useSplitRatio()).result.current[0]).toBe(DEFAULT_SPLIT)
    localStorage.setItem('file-viewer-split', '5')
    expect(renderHook(() => useSplitRatio()).result.current[0]).toBe(MAX_SPLIT)
  })
})
