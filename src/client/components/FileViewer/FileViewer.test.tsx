import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'

vi.mock('react-syntax-highlighter', () => ({ PrismAsync: () => null }))

import en from '../../locales/en.json'
import fi from '../../locales/fi.json'
import sv from '../../locales/sv.json'
import { createMemoryStore } from '../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../util/myFiles/store'
import MyFilesDialog from '../MyFiles/MyFilesDialog'
import { MyFilesStoreProvider } from '../MyFiles/MyFilesStoreContext'
import FileViewer from './FileViewer'
import { FileViewerProvider, useFileViewer } from './FileViewerContext'
import { MAX_VIEWER_TEXT_BYTES, viewerFileKind } from './fileKind'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
afterEach(cleanup)

const renderViewer = (store: MyFilesStore, path: string, onClose = vi.fn()) => {
  render(
    <I18nextProvider i18n={i18n}>
      <FileViewer store={store} target={{ path }} onClose={onClose} />
    </I18nextProvider>,
  )
  return onClose
}

const storeWith = async (files: Record<string, string>) => {
  const store = createMemoryStore()
  for (const [path, text] of Object.entries(files)) await store.write(path, text)
  return store
}

describe('viewerFileKind', () => {
  test('knows Markdown, text and PDF files only', () => {
    expect(viewerFileKind('Course/notes.md')).toBe('markdown')
    expect(viewerFileKind('README.MD')).toBe('markdown')
    expect(viewerFileKind('a/b.txt')).toBe('text')
    expect(viewerFileKind('book.pdf')).toBe('pdf')
    expect(viewerFileKind('Book.PDF')).toBe('pdf')
    expect(viewerFileKind('slides.pptx')).toBe(null)
    expect(viewerFileKind('md')).toBe(null)
    expect(viewerFileKind('folder.md/file')).toBe(null)
  })
})

describe('FileViewer', () => {
  test('renders Markdown without loading images, with safe links and escaped HTML', async () => {
    const store = await storeWith({
      'Course/notes.md': [
        '# Week 3',
        '',
        '![A secret chart](https://evil.example/leak?data=1)',
        '',
        '[External](https://example.com/page) [Jump](#week-3) [Other file](other.md)',
        '',
        '<script>alert(1)</script><b>bold?</b>',
      ].join('\n'),
    })
    renderViewer(store, 'Course/notes.md')

    const viewer = screen.getByTestId('file-viewer')
    const heading = await within(viewer).findByRole('heading', { level: 1, name: 'Week 3' })
    expect(heading.id).toBe('user-content-week-3')

    expect(viewer.querySelector('img')).toBe(null)
    expect(screen.getByTestId('markdown-image-placeholder').textContent).toBe('Image (not shown): A secret chart')

    const external = screen.getByRole('link', { name: /External/ })
    expect(external.getAttribute('target')).toBe('_blank')
    expect(external.getAttribute('rel')).toBe('noopener noreferrer')
    expect(external.textContent).toContain('opens in a new tab')

    const anchor = screen.getByRole('link', { name: 'Jump' })
    expect(anchor.getAttribute('target')).toBe(null)
    const scrollIntoView = vi.fn()
    heading.scrollIntoView = scrollIntoView
    fireEvent.click(anchor)
    expect(scrollIntoView).toHaveBeenCalled()

    expect(screen.queryByRole('link', { name: 'Other file' })).toBe(null)
    expect(viewer.textContent).toContain('Other file')

    expect(viewer.querySelector('script')).toBe(null)
    expect(viewer.querySelector('b')).toBe(null)
    expect(viewer.textContent).toContain('<script>alert(1)</script>')
  })

  test('shows text files as preformatted text', async () => {
    const store = await storeWith({ 'a.txt': 'line 1\n  # not a heading' })
    renderViewer(store, 'a.txt')
    const text = await screen.findByTestId('file-viewer-text')
    expect(text.tagName).toBe('PRE')
    expect(text.textContent).toBe('line 1\n  # not a heading')
    expect(screen.queryByRole('heading', { level: 1 })).toBe(null)
  })

  test('does not read files that are too large', async () => {
    const store = await storeWith({ 'big.txt': 'x' })
    const readText = vi.fn(store.readText)
    const big: MyFilesStore = {
      ...store,
      readText,
      stat: async (path) => {
        const entry = await store.stat(path)
        return entry && { ...entry, size: MAX_VIEWER_TEXT_BYTES + 1 }
      },
    }
    renderViewer(big, 'big.txt')
    expect((await screen.findByTestId('file-viewer-message')).textContent).toBe('This file is too large to display.')
    expect(readText).not.toHaveBeenCalled()
  })

  test('says when the file is no longer in My files', async () => {
    renderViewer(createMemoryStore(), 'gone.md')
    expect((await screen.findByTestId('file-viewer-message')).textContent).toBe('gone.md is no longer in My files.')
  })

  test('has a toolbar with the file name and a close button', async () => {
    const store = await storeWith({ 'Course/notes.md': 'Hello' })
    const onClose = renderViewer(store, 'Course/notes.md')
    expect(screen.getByRole('region', { name: 'notes.md' })).toBeTruthy()
    expect(screen.getByText('Experimental')).toBeTruthy()
    await screen.findByText('Hello')
    fireEvent.click(screen.getByRole('button', { name: 'Close notes.md' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

/** Selects the whole text of `element` and lets the viewer know, as the browser would. */
const selectText = (element: Element) => {
  const range = document.createRange()
  range.selectNodeContents(element)
  const selection = document.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  act(() => {
    document.dispatchEvent(new Event('selectionchange'))
  })
}

describe('FileViewer Ask…', () => {
  afterEach(() => document.getSelection()?.removeAllRanges())

  const renderWithAsk = async ({ quickActionsDisabled = false, lng = i18n } = {}) => {
    const store = await storeWith({ 'Course/notes.md': '# Week 3\n\nIntro\n\n## Eigenvalues\n\nAn eigenvector keeps its direction.' })
    const onAddQuote = vi.fn()
    render(
      <I18nextProvider i18n={lng}>
        <FileViewer store={store} target={{ path: 'Course/notes.md' }} onClose={vi.fn()} onAddQuote={onAddQuote} quickActionsDisabled={quickActionsDisabled} />
      </I18nextProvider>,
    )
    const paragraph = await screen.findByText('An eigenvector keeps its direction.')
    return { onAddQuote, paragraph }
  }
  const toolbarAsk = () => screen.getByTestId('file-viewer-ask') as HTMLButtonElement
  const expectedQuote = {
    quote: { kind: 'text', path: 'Course/notes.md', heading: 'Eigenvalues', text: 'An eigenvector keeps its direction.' },
    truncated: false,
  }

  test('the toolbar action is enabled while text in the file is selected, and adds it as a quote', async () => {
    const { onAddQuote, paragraph } = await renderWithAsk()
    expect(toolbarAsk().disabled).toBe(true)

    selectText(paragraph)
    expect(toolbarAsk().disabled).toBe(false)
    fireEvent.click(toolbarAsk())
    expect(onAddQuote).toHaveBeenCalledWith(expectedQuote)

    document.getSelection()!.removeAllRanges()
    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
    })
    expect(toolbarAsk().disabled).toBe(true)
  })

  test('a selection outside the file content (the toolbar title) does not count', async () => {
    await renderWithAsk()
    selectText(screen.getByRole('heading', { level: 2, name: 'notes.md' }))
    expect(toolbarAsk().disabled).toBe(true)
  })

  test('a mouse selection shows a floating toolbar inside the viewer region, which hides on scroll', async () => {
    const { onAddQuote, paragraph } = await renderWithAsk()
    expect(screen.queryByTestId('file-viewer-selection-toolbar')).toBe(null)

    selectText(paragraph)
    fireEvent.mouseUp(paragraph)
    const floating = screen.getByRole('toolbar', { name: 'Selection actions' })
    expect(screen.getByTestId('file-viewer').contains(floating)).toBe(true)

    fireEvent.scroll(screen.getByTestId('file-viewer'))
    expect(screen.queryByTestId('file-viewer-selection-toolbar')).toBe(null)

    fireEvent.mouseUp(paragraph)
    fireEvent.click(within(screen.getByRole('toolbar', { name: 'Selection actions' })).getByRole('button', { name: 'Ask…' }))
    expect(onAddQuote).toHaveBeenCalledWith(expectedQuote)
    expect(screen.queryByTestId('file-viewer-selection-toolbar')).toBe(null)
  })

  test('the floating toolbar hides when the selection collapses', async () => {
    const { paragraph } = await renderWithAsk()
    selectText(paragraph)
    fireEvent.mouseUp(paragraph)
    expect(screen.getByTestId('file-viewer-selection-toolbar')).toBeTruthy()

    document.getSelection()!.removeAllRanges()
    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
    })
    expect(screen.queryByTestId('file-viewer-selection-toolbar')).toBe(null)
  })

  const toolbarButton = (action: string) => screen.getByTestId(`file-viewer-${action}`) as HTMLButtonElement

  test('the quick actions send the quote right away with a fixed message, from the toolbar and the floating toolbar', async () => {
    const { onAddQuote, paragraph } = await renderWithAsk()
    for (const action of ['explain', 'summarize', 'translate']) expect(toolbarButton(action).disabled).toBe(true)

    selectText(paragraph)
    fireEvent.click(toolbarButton('explain'))
    expect(onAddQuote).toHaveBeenLastCalledWith(expectedQuote, { message: 'Explain this passage.', send: true })
    fireEvent.click(toolbarButton('summarize'))
    expect(onAddQuote).toHaveBeenLastCalledWith(expectedQuote, { message: 'Summarize this passage.', send: true })

    fireEvent.mouseUp(paragraph)
    const floating = screen.getByRole('toolbar', { name: 'Selection actions' })
    expect(
      within(floating)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Explain', 'Summarize', 'Translate', 'Ask…'])
    fireEvent.click(within(floating).getByRole('button', { name: 'Translate' }))
    expect(onAddQuote).toHaveBeenLastCalledWith(expectedQuote, {
      message: 'Translate this passage into English, unless our conversation suggests another language.',
      send: true,
    })
    expect(screen.queryByTestId('file-viewer-selection-toolbar')).toBe(null)
  })

  test('the quick actions are disabled while a response streams, Ask… is not', async () => {
    const { onAddQuote, paragraph } = await renderWithAsk({ quickActionsDisabled: true })
    selectText(paragraph)
    for (const action of ['explain', 'summarize', 'translate']) expect(toolbarButton(action).disabled).toBe(true)
    expect(toolbarAsk().disabled).toBe(false)

    fireEvent.mouseUp(paragraph)
    const floating = screen.getByRole('toolbar', { name: 'Selection actions' })
    expect((within(floating).getByRole('button', { name: 'Explain' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(within(floating).getByRole('button', { name: 'Ask…' }))
    expect(onAddQuote).toHaveBeenCalledWith(expectedQuote)
  })

  test.each([
    ['fi', fi, 'Selitä tämä kohta.', 'suomeksi'],
    ['sv', sv, 'Förklara det här avsnittet.', 'till svenska'],
  ])('in %s the messages are in the UI language and Translate names it', async (lng, resources, explain, language) => {
    const localized = i18next.createInstance()
    await localized.use(initReactI18next).init({ resources: { [lng]: resources }, lng, defaultNS: 'common' })
    const { onAddQuote, paragraph } = await renderWithAsk({ lng: localized })
    selectText(paragraph)
    fireEvent.click(toolbarButton('explain'))
    expect(onAddQuote).toHaveBeenLastCalledWith(expectedQuote, { message: explain, send: true })
    fireEvent.click(toolbarButton('translate'))
    expect(onAddQuote.mock.lastCall![1].message).toContain(language)
  })

  test('without onAddQuote there is no Ask… action', async () => {
    const store = await storeWith({ 'a.txt': 'text' })
    renderViewer(store, 'a.txt')
    await screen.findByTestId('file-viewer-text')
    expect(screen.queryByTestId('file-viewer-ask')).toBe(null)
  })
})

const OpenTarget = () => {
  const viewer = useFileViewer()
  return <output data-testid="viewer-target">{viewer?.target?.path ?? ''}</output>
}

const renderDialog = (store: MyFilesStore, { viewer = true, onClose = vi.fn() } = {}) => {
  render(
    <I18nextProvider i18n={i18n}>
      <MyFilesStoreProvider store={store}>
        <FileViewerProvider available={viewer}>
          <MyFilesDialog open onClose={onClose} />
          <OpenTarget />
        </FileViewerProvider>
      </MyFilesStoreProvider>
    </I18nextProvider>,
  )
  return onClose
}

describe('My files dialog Open action', () => {
  const files = { 'Course/notes.md': '# Notes', 'Course/list.txt': 'a', 'Course/book.pdf': '%PDF', 'Course/data.csv': 'a,b', 'loose.txt': 'b' }

  test('is shown for Markdown, text and PDF files only, and opens them in the viewer', async () => {
    const store = await storeWith(files)
    const onClose = renderDialog(store)
    const dialog = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(await within(dialog).findByRole('button', { name: /^Course/ }))
    })

    const openButtons = within(dialog)
      .getAllByTestId('my-files-open')
      .map((button) => button.getAttribute('aria-label'))
    expect(openButtons.sort()).toEqual(['Open book.pdf', 'Open list.txt', 'Open loose.txt', 'Open notes.md'])

    fireEvent.click(within(dialog).getByRole('button', { name: 'Open notes.md' }))
    expect(screen.getByTestId('viewer-target').textContent).toBe('Course/notes.md')
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('is not shown when the viewer is not available', async () => {
    const store = await storeWith(files)
    renderDialog(store, { viewer: false })
    const dialog = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(await within(dialog).findByRole('button', { name: /^Course/ }))
    })
    await waitFor(() => expect(within(dialog).getByText('notes.md')).toBeTruthy())
    expect(within(dialog).queryAllByTestId('my-files-open')).toHaveLength(0)
  })
})
