import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('react-syntax-highlighter', () => ({ PrismAsync: () => null }))

/** A stand-in for pdf.js's viewer: records what the FileViewer asks of it, and lets the test fire its events. */
const fake = vi.hoisted(() => {
  type Handler = (event: Record<string, unknown>) => void
  const state = {
    getDocument: (() => ({ promise: new Promise(() => {}), destroy: async () => {} })) as (params: unknown) => {
      promise: Promise<unknown>
      destroy: () => Promise<void>
    },
    viewer: null as null | FakeViewer,
    bus: null as null | FakeEventBus,
  }
  class FakeEventBus {
    handlers = new Map<string, Handler[]>()
    constructor() {
      state.bus = this
    }
    on(name: string, handler: Handler) {
      this.handlers.set(name, [...(this.handlers.get(name) ?? []), handler])
    }
    dispatch(name: string, event: Record<string, unknown> = {}) {
      for (const handler of this.handlers.get(name) ?? []) handler(event)
    }
  }
  class FakeViewer {
    pagesCount = 0
    currentPageNumber = 1
    currentScaleValue = 'auto'
    viewerElement: HTMLElement
    increaseScale = vi.fn()
    decreaseScale = vi.fn()
    constructor(options: { viewer: HTMLElement }) {
      this.viewerElement = options.viewer
      state.viewer = this
    }
    setDocument(doc: { numPages: number } | null) {
      if (!doc) return
      for (let n = 1; n <= doc.numPages; n++) {
        const page = document.createElement('div')
        page.className = 'page'
        page.setAttribute('role', 'region')
        page.dataset.pageNumber = String(n)
        page.innerHTML = `<div class="textLayer"><span>Text of page ${n}.</span></div>`
        this.viewerElement.append(page)
      }
      this.pagesCount = doc.numPages
    }
    update() {}
  }
  class FakeLinkService {
    setViewer() {}
    setDocument() {}
  }
  return { state, FakeEventBus, FakeViewer, FakeLinkService }
})

vi.mock('../../util/pdfjs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../util/pdfjs')>()),
  loadPdfViewer: async () => ({
    pdfjs: { getDocument: (params: unknown) => fake.state.getDocument(params), AnnotationMode: { ENABLE: 1 }, AnnotationEditorType: { DISABLE: -1 } },
    components: { EventBus: fake.FakeEventBus, PDFViewer: fake.FakeViewer, PDFLinkService: fake.FakeLinkService },
  }),
}))

import en from '../../locales/en.json'
import { createMemoryStore } from '../../util/myFiles/memoryStore'
import type { MyFilesStore } from '../../util/myFiles/store'
import FileViewer from './FileViewer'
import { MyFilesStoreProvider } from '../MyFiles/MyFilesStoreContext'
import { FileViewerProvider, useFileViewer, type ViewerTarget } from './FileViewerContext'
import type { PendingQuote } from './selectionQuote'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({ resources: { en }, lng: 'en', fallbackLng: 'en', defaultNS: 'common' })
})
beforeEach(() => {
  localStorage.clear()
  fake.state.viewer = null
  fake.state.bus = null
})
afterEach(cleanup)

const failingWith = (error: unknown) => () => ({ promise: Promise.reject(error), destroy: async () => {} })
const loading = (numPages: number) => () => ({ promise: Promise.resolve({ numPages }), destroy: async () => {} })

const ui = (store: MyFilesStore, target: ViewerTarget, onAddQuote?: (pending: PendingQuote) => void) => (
  <I18nextProvider i18n={i18n}>
    <FileViewer store={store} target={target} onAddQuote={onAddQuote} />
  </I18nextProvider>
)

const storeWithPdf = async () => {
  const store = createMemoryStore()
  await store.write('Course/book.pdf', new Uint8Array([37, 80, 68, 70]))
  return store
}

describe('FileViewer PDFs', () => {
  test('a password-protected PDF says so instead of showing an empty panel', async () => {
    fake.state.getDocument = failingWith({ name: 'PasswordException' })
    render(ui(await storeWithPdf(), { path: 'Course/book.pdf' }))
    expect((await screen.findByTestId('file-viewer-message')).textContent).toBe('This PDF is password-protected and cannot be displayed.')
    expect(screen.queryByTestId('file-viewer-pdf-page')).toBe(null)
  })

  test('an invalid PDF says so', async () => {
    fake.state.getDocument = failingWith({ name: 'InvalidPDFException' })
    render(ui(await storeWithPdf(), { path: 'Course/book.pdf' }))
    expect((await screen.findByTestId('file-viewer-message')).textContent).toBe('This file could not be read as a PDF.')
  })

  test('a missing PDF says it is no longer in My files', async () => {
    fake.state.getDocument = loading(1)
    render(ui(createMemoryStore(), { path: 'Course/book.pdf' }))
    expect((await screen.findByTestId('file-viewer-message')).textContent).toContain('book.pdf')
  })

  test('shows the page counter and zoom controls, labels the pages and opens at the target page', async () => {
    fake.state.getDocument = loading(7)
    const store = await storeWithPdf()
    const { rerender } = render(ui(store, { path: 'Course/book.pdf', page: 3 }))

    const counter = await screen.findByTestId('file-viewer-pdf-page')
    expect(counter.textContent).toBe('Page 1 / 7')
    const viewer = fake.state.viewer!
    act(() => fake.state.bus!.dispatch('pagesinit'))
    expect(viewer.currentScaleValue).toBe('page-width')
    expect(viewer.currentPageNumber).toBe(3)
    expect(screen.getByRole('region', { name: 'Page 7' })).toBeTruthy()

    act(() => fake.state.bus!.dispatch('pagechanging', { pageNumber: 3 }))
    expect(counter.textContent).toBe('Page 3 / 7')
    expect(screen.getByTestId('file-viewer-pdf').getAttribute('data-page')).toBe('3')

    // Opening the same file at another page jumps there; pages past the end go to the last page.
    rerender(ui(store, { path: 'Course/book.pdf', page: 5 }))
    expect(viewer.currentPageNumber).toBe(5)
    rerender(ui(store, { path: 'Course/book.pdf', page: 99 }))
    expect(viewer.currentPageNumber).toBe(7)

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(viewer.increaseScale).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(viewer.decreaseScale).toHaveBeenCalledOnce()
    viewer.currentScaleValue = '1.5'
    act(() => fake.state.bus!.dispatch('scalechanging', { scale: 1.5 }))
    expect(screen.getByTestId('file-viewer-zoom').textContent).toBe('150%')
    fireEvent.click(screen.getByRole('button', { name: 'Fit to width' }))
    expect(viewer.currentScaleValue).toBe('page-width')
  })

  test('tells the chat the current page', async () => {
    fake.state.getDocument = loading(7)
    const store = await storeWithPdf()
    let readPosition: ((path: string) => unknown) | undefined
    const Probe = () => {
      readPosition = useFileViewer()?.readPosition
      return null
    }
    render(
      <MyFilesStoreProvider store={store}>
        <FileViewerProvider available>
          <Probe />
          {ui(store, { path: 'Course/book.pdf' })}
        </FileViewerProvider>
      </MyFilesStoreProvider>,
    )
    expect(readPosition?.('Course/book.pdf')).toEqual({ path: 'Course/book.pdf' })
    await screen.findByTestId('file-viewer-pdf-page')
    act(() => fake.state.bus!.dispatch('pagesinit'))
    expect(readPosition?.('Course/book.pdf')).toEqual({ path: 'Course/book.pdf', page: 1 })
    act(() => fake.state.bus!.dispatch('pagechanging', { pageNumber: 3 }))
    expect(readPosition?.('Course/book.pdf')).toEqual({ path: 'Course/book.pdf', page: 3 })
  })

  test('a selection on a page is quoted with that page, and the floating toolbar hides on scroll of the PDF', async () => {
    fake.state.getDocument = loading(3)
    const onAddQuote = vi.fn()
    render(ui(await storeWithPdf(), { path: 'Course/book.pdf' }, onAddQuote))
    const span = await screen.findByText('Text of page 2.')

    const range = document.createRange()
    range.selectNodeContents(span)
    document.getSelection()!.removeAllRanges()
    document.getSelection()!.addRange(range)
    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
    })
    fireEvent.mouseUp(span)
    expect(screen.getByRole('toolbar', { name: 'Selection actions' })).toBeTruthy()

    fireEvent.scroll(screen.getByTestId('file-viewer-pdf'))
    expect(screen.queryByTestId('file-viewer-selection-toolbar')).toBe(null)

    fireEvent.click(screen.getByTestId('file-viewer-ask'))
    expect(onAddQuote).toHaveBeenCalledWith({ quote: { kind: 'text', path: 'Course/book.pdf', page: 2, text: 'Text of page 2.' }, truncated: false })
    document.getSelection()!.removeAllRanges()
  })

  test('opens at the remembered page of the same file version, unless a target page is given', async () => {
    fake.state.getDocument = loading(7)
    const store = await storeWithPdf()
    const first = render(ui(store, { path: 'Course/book.pdf' }))
    await screen.findByTestId('file-viewer-pdf-page')
    act(() => fake.state.bus!.dispatch('pagesinit'))
    act(() => fake.state.bus!.dispatch('pagechanging', { pageNumber: 4 }))
    first.unmount()

    const second = render(ui(store, { path: 'Course/book.pdf' }))
    await screen.findByTestId('file-viewer-pdf-page')
    act(() => fake.state.bus!.dispatch('pagesinit'))
    expect(fake.state.viewer!.currentPageNumber).toBe(4)
    second.unmount()

    render(ui(store, { path: 'Course/book.pdf', page: 2 }))
    await screen.findByTestId('file-viewer-pdf-page')
    act(() => fake.state.bus!.dispatch('pagesinit'))
    expect(fake.state.viewer!.currentPageNumber).toBe(2)
  })

  test('a replaced file starts at the first page', async () => {
    fake.state.getDocument = loading(7)
    const store = await storeWithPdf()
    const first = render(ui(store, { path: 'Course/book.pdf' }))
    await screen.findByTestId('file-viewer-pdf-page')
    act(() => fake.state.bus!.dispatch('pagesinit'))
    act(() => fake.state.bus!.dispatch('pagechanging', { pageNumber: 4 }))
    first.unmount()

    await store.write('Course/book.pdf', new Uint8Array([37, 80, 68, 70]), { lastModified: 1 })
    render(ui(store, { path: 'Course/book.pdf' }))
    await screen.findByTestId('file-viewer-pdf-page')
    act(() => fake.state.bus!.dispatch('pagesinit'))
    expect(fake.state.viewer!.currentPageNumber).toBe(1)
  })
})
