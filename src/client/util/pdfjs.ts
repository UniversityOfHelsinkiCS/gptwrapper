/**
 * pdf.js, loaded only when a PDF is parsed: the library and its worker are separate chunks, not in the main bundle.
 * The worker is served from the app itself (Vite's `?url` import), so its version always matches the library's.
 */
export type Pdfjs = typeof import('pdfjs-dist/legacy/build/pdf.mjs')

let pdfjsPromise: Promise<Pdfjs> | null = null

export const loadPdfjs = (): Promise<Pdfjs> =>
  (pdfjsPromise ??= Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]).then(
    ([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    },
  )).catch((error) => {
    // A failed chunk load (e.g. after a deploy) can be retried.
    pdfjsPromise = null
    throw error
  })

export type PdfViewerComponents = typeof import('pdfjs-dist/legacy/web/pdf_viewer.mjs')

/** The class that scopes pdf.js's viewer styles: put it on the viewer's scroll container. */
export const PDF_VIEWER_SCOPE_CLASS = 'pdfjs-viewer-scope'

/**
 * Scopes a stylesheet to the elements inside (and including) `.scopeClass`: pdf.js's viewer CSS has generic class names
 * (`.page`, `.hidden`, `.dialog`) and sets its variables on `:root`, which here become the scope root.
 */
export const scopeCss = (css: string, scopeClass: string): string => `@scope (.${scopeClass}) {\n${css.replace(/:root\b/g, ':scope')}\n}`

/** The one rule pdf.js needs outside the viewer: the text layer measures text in a canvas appended to the body. */
const PDF_VIEWER_GLOBAL_CSS = 'canvas.hiddenCanvasElement{position:absolute;top:0;left:0;width:0;height:0;display:none}'

let viewerPromise: Promise<{ pdfjs: Pdfjs; components: PdfViewerComponents }> | null = null

/**
 * pdf.js's viewer component (virtualized pages, text layer, links) and its styles, in their own lazy chunks next to
 * `loadPdfjs()`. The viewer finds the library through `globalThis.pdfjsLib`, so that is set before it is imported.
 */
export const loadPdfViewer = (): Promise<{ pdfjs: Pdfjs; components: PdfViewerComponents }> =>
  (viewerPromise ??= (async () => {
    const pdfjs = await loadPdfjs()
    ;(globalThis as { pdfjsLib?: Pdfjs }).pdfjsLib = pdfjs
    const [components, css] = await Promise.all([import('pdfjs-dist/legacy/web/pdf_viewer.mjs'), import('pdfjs-dist/legacy/web/pdf_viewer.css?inline')])
    if (!document.getElementById('pdfjs-viewer-styles')) {
      const style = document.createElement('style')
      style.id = 'pdfjs-viewer-styles'
      style.textContent = `${scopeCss(css.default, PDF_VIEWER_SCOPE_CLASS)}\n${PDF_VIEWER_GLOBAL_CSS}`
      document.head.append(style)
    }
    return { pdfjs, components }
  })()).catch((error) => {
    viewerPromise = null
    throw error
  })
