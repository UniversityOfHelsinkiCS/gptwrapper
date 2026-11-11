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
