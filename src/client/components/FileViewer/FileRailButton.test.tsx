import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import en from '../../locales/en.json'
import FileRailButton from './FileRailButton'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(cleanup)

describe('FileRailButton', () => {
  test('is labelled with the file name and expands the viewer', () => {
    const onExpand = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <FileRailButton path="Course notes/lecture.md" onExpand={onExpand} />
      </I18nextProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open lecture.md' }))
    expect(onExpand).toHaveBeenCalledOnce()
  })
})

describe('FileRailButton count', () => {
  test('has a badge and says the count with two or more files', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <FileRailButton path="lecture.md" count={3} onExpand={vi.fn()} />
      </I18nextProvider>,
    )
    const button = screen.getByRole('button', { name: 'Open lecture.md (3 files in this chat)' })
    expect(button.textContent).toBe('3')
  })

  test('has no badge with one file', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <FileRailButton path="lecture.md" count={1} onExpand={vi.fn()} />
      </I18nextProvider>,
    )
    expect(screen.getByRole('button', { name: 'Open lecture.md' }).textContent).toBe('')
  })
})
