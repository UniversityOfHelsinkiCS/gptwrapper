import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { PDFViewer } from 'pdfjs-dist/legacy/web/pdf_viewer.mjs'
import { toPdfParseError } from '../../util/myFiles/pdfText'
import type { MyFilesStore } from '../../util/myFiles/store'
import { loadPdfViewer } from '../../util/pdfjs'

export type PdfStatus =
  | { state: 'loading' }
  | { state: 'ready'; pageCount: number }
  | { state: 'missing' }
  | { state: 'password' }
  | { state: 'invalid' }
  | { state: 'error' }

/**
 * pdf.js's own localization would label the pages in English: this one does nothing, and the pages are labelled with
 * the app's translations instead (`pageLabel`).
 */
const silentL10n = {
  getLanguage: () => document.documentElement.lang || 'en',
  getDirection: () => 'ltr',
  get: async (_ids: unknown, _args?: unknown, fallback?: string) => fallback ?? '',
  translate: async () => {},
  translateOnce: async () => {},
  pause: () => {},
  resume: () => {},
  destroy: async () => {},
}

/**
 * Shows a My files PDF with pdf.js's viewer in `containerRef` (an absolutely positioned scroll container) around
 * `viewerRef`: virtualized pages, a text layer and internal links. Fits the page width, also when the container is
 * resized, until the user zooms. `goToPage` jumps to a physical, 1-based page, also before the document has loaded.
 */
export const usePdfViewer = ({
  store,
  path,
  containerRef,
  viewerRef,
  pageLabel,
}: {
  store: MyFilesStore
  path: string
  containerRef: RefObject<HTMLDivElement | null>
  viewerRef: RefObject<HTMLDivElement | null>
  /** The accessible name of a page region, e.g. "Page 3". */
  pageLabel: (page: number) => string
}) => {
  const [status, setStatus] = useState<PdfStatus>({ state: 'loading' })
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1)
  const viewerInstance = useRef<PDFViewer | null>(null)
  const pendingPage = useRef<number | undefined>(undefined)
  const pageLabelRef = useRef(pageLabel)
  pageLabelRef.current = pageLabel

  useEffect(() => {
    const container = containerRef.current
    const viewerElement = viewerRef.current
    if (!container || !viewerElement) return
    let cancelled = false
    const abort = new AbortController()
    let destroyTask: (() => Promise<void>) | null = null
    let resizeObserver: ResizeObserver | null = null
    setStatus({ state: 'loading' })
    setPage(1)

    void (async () => {
      try {
        const entry = await store.stat(path)
        if (cancelled) return
        if (!entry || entry.kind !== 'file') {
          setStatus({ state: 'missing' })
          return
        }
        const [{ pdfjs, components }, bytes] = await Promise.all([loadPdfViewer(), store.readBytes(path)])
        if (cancelled) return

        const eventBus = new components.EventBus()
        const linkService = new components.PDFLinkService({ eventBus })
        const viewer = new components.PDFViewer({
          container,
          viewer: viewerElement,
          eventBus,
          linkService,
          l10n: silentL10n,
          annotationMode: pdfjs.AnnotationMode.ENABLE,
          annotationEditorMode: pdfjs.AnnotationEditorType.DISABLE,
          abortSignal: abort.signal,
        } as ConstructorParameters<typeof components.PDFViewer>[0])
        linkService.setViewer(viewer)

        eventBus.on('pagesinit', () => {
          viewer.currentScaleValue = 'page-width'
          for (const pageElement of viewerElement.querySelectorAll<HTMLElement>('.page[data-page-number]')) {
            pageElement.setAttribute('aria-label', pageLabelRef.current(Number(pageElement.dataset.pageNumber)))
          }
          if (pendingPage.current) {
            viewer.currentPageNumber = Math.min(Math.max(1, pendingPage.current), viewer.pagesCount)
            pendingPage.current = undefined
          }
        })
        // pdf.js makes each text layer a tab stop without a role; the scroll container is the one tab stop. Internal
        // links still move focus to the target page's text layer.
        eventBus.on('textlayerrendered', ({ source }: { source: { textLayer?: { div?: HTMLElement } | null } }) => {
          if (source.textLayer?.div) source.textLayer.div.tabIndex = -1
        })
        eventBus.on('pagechanging', ({ pageNumber }: { pageNumber: number }) => setPage(pageNumber))
        eventBus.on('scalechanging', ({ scale: next }: { scale: number }) => setScale(next))

        let lastWidth = container.clientWidth
        resizeObserver = new ResizeObserver(() => {
          if (container.clientWidth === lastWidth || viewer.pagesCount === 0) return
          lastWidth = container.clientWidth
          // Re-fits a preset zoom ("page-width") to the new width; a chosen zoom stays.
          if (viewer.currentScaleValue === 'page-width') viewer.currentScaleValue = 'page-width'
          else viewer.update()
        })
        resizeObserver.observe(container)

        // pdf.js transfers (detaches) the buffer it is given.
        const task = pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false, verbosity: 0 })
        destroyTask = () => task.destroy()
        let doc: Awaited<typeof task.promise>
        try {
          doc = await task.promise
        } catch (error) {
          if (!cancelled) setStatus({ state: toPdfParseError(error).reason })
          return
        }
        if (cancelled) return
        viewer.setDocument(doc)
        linkService.setDocument(doc, null)
        viewerInstance.current = viewer
        setStatus({ state: 'ready', pageCount: doc.numPages })
      } catch {
        if (!cancelled) setStatus({ state: 'error' })
      }
    })()

    return () => {
      cancelled = true
      abort.abort()
      resizeObserver?.disconnect()
      viewerInstance.current?.setDocument(null as never)
      viewerInstance.current = null
      pendingPage.current = undefined
      void destroyTask?.()
      viewerElement.replaceChildren()
    }
  }, [store, path, containerRef, viewerRef])

  const goToPage = useCallback((target: number) => {
    const viewer = viewerInstance.current
    if (viewer && viewer.pagesCount > 0) viewer.currentPageNumber = Math.min(Math.max(1, target), viewer.pagesCount)
    else pendingPage.current = target
  }, [])
  const zoomIn = useCallback(() => viewerInstance.current?.increaseScale(), [])
  const zoomOut = useCallback(() => viewerInstance.current?.decreaseScale(), [])
  const fitWidth = useCallback(() => {
    if (viewerInstance.current) viewerInstance.current.currentScaleValue = 'page-width'
  }, [])

  return { status, page, scale, goToPage, zoomIn, zoomOut, fitWidth }
}
