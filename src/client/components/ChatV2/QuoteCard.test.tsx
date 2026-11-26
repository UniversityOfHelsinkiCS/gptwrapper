import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
vi.mock('../../util/featureEvents', () => ({ trackFeatureEvent: vi.fn() }))

import en from '../../locales/en.json'
import { createMemoryStore } from '../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../util/myFiles/store'
import { FileViewerProvider, useFileViewer } from '../FileViewer/FileViewerContext'
import { MyFilesStoreProvider } from '../MyFiles/MyFilesStoreContext'
import { trackFeatureEvent } from '../../util/featureEvents'
import { QuoteCard } from './QuoteCard'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.mocked(trackFeatureEvent).mockClear()
})

const renderCard = (quote: { path: string; page?: number; heading?: string; text: string }) =>
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

  test('a PDF quote shows its page', () => {
    renderCard({ path: 'Course/book.pdf', page: 12, text: 'Entropy grows.' })
    expect(screen.getByTestId('quote-card-source').textContent).toBe('📄 book.pdf · p. 12')
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

const ViewerTarget = () => {
  const target = useFileViewer()?.target
  return <output data-testid="viewer-target">{target ? JSON.stringify(target) : ''}</output>
}

const renderWithViewer = (store: MyFilesStore, quote: { path: string; page?: number; heading?: string; text: string }, available = true) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MyFilesStoreProvider store={store}>
        <FileViewerProvider available={available}>
          <QuoteCard quote={{ kind: 'text', ...quote }} />
          <ViewerTarget />
        </FileViewerProvider>
      </MyFilesStoreProvider>
    </I18nextProvider>,
  )

describe('QuoteCard source', () => {
  const storeWith = async (path: string) => {
    const store = createMemoryStore()
    await store.write(path, 'content')
    return store
  }

  test('opens the file in the viewer at the quoted page when it is in My files', async () => {
    const store = await storeWith('Course/book.pdf')
    renderWithViewer(store, { path: 'Course/book.pdf', page: 12, text: 'Entropy grows.' })
    const button = await screen.findByRole('button', { name: 'Open book.pdf · p. 12 in the file viewer' })
    expect(screen.getByTestId('quote-card-source').textContent).toBe('📄 book.pdf · p. 12')
    fireEvent.click(button)
    expect(JSON.parse(screen.getByTestId('viewer-target').textContent!)).toEqual({ path: 'Course/book.pdf', page: 12 })
    expect(vi.mocked(trackFeatureEvent).mock.calls).toEqual([[{ feature: 'viewer', action: 'open', fileType: 'pdf', source: 'quote' }]])
  })

  test('opens a Markdown file at the quoted heading', async () => {
    const store = await storeWith('notes.md')
    renderWithViewer(store, { path: 'notes.md', heading: 'Eigenvalues', text: 'An eigenvector.' })
    fireEvent.click(await screen.findByTestId('quote-card-open'))
    expect(JSON.parse(screen.getByTestId('viewer-target').textContent!)).toEqual({ path: 'notes.md', heading: 'Eigenvalues' })
  })

  test('is plain text when the file is no longer in My files', async () => {
    const store = await storeWith('other.pdf')
    const stat = vi.spyOn(store, 'stat')
    renderWithViewer(store, { path: 'Course/book.pdf', page: 12, text: 'Entropy grows.' })
    await waitFor(() => expect(stat).toHaveBeenCalledWith('Course/book.pdf'))
    await stat.mock.results[0].value
    expect(screen.queryByRole('button')).toBe(null)
    expect(screen.getByTestId('quote-card-source').textContent).toBe('📄 book.pdf · p. 12')
  })

  test('is plain text when the viewer is not available', async () => {
    const store = await storeWith('Course/book.pdf')
    const stat = vi.spyOn(store, 'stat')
    renderWithViewer(store, { path: 'Course/book.pdf', page: 12, text: 'Entropy grows.' }, false)
    await Promise.resolve()
    expect(stat).not.toHaveBeenCalled()
    expect(screen.queryByRole('button')).toBe(null)
  })
})
