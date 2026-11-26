import { MAX_QUOTE_LENGTH, type QuickAction, type TextQuote } from '@shared/quote'

/** A quote made from a selection in the viewer, waiting to be sent. `truncated` when the selection was cut to the maximum length. */
export interface PendingQuote {
  quote: TextQuote
  truncated: boolean
}

/**
 * How a quote goes to the chat: as a chip waiting for a typed question ("Ask…"), or sent right away with `message` (the
 * quick action `action`).
 */
export type AddQuoteOptions = { message?: string; send?: boolean; action?: QuickAction }

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6'

/** The text of the last heading in `container` that comes before `node` (or contains it), if any. */
export const nearestHeading = (container: HTMLElement, node: Node): string | undefined => {
  let found: string | undefined
  for (const heading of container.querySelectorAll(HEADING_SELECTOR)) {
    const precedes = heading.contains(node) || !!(heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)
    if (!precedes) break
    const text = heading.textContent?.trim()
    if (text) found = text
  }
  return found
}

/** How far below the top of the visible area a heading still counts as the start of the section in view. */
const HEADING_IN_VIEW_SLACK = 16

/**
 * The text of the heading of the section in view: the last heading in `container` that starts above `top` (a viewport
 * y, the top of the visible area), or just below it. Undefined above the first heading.
 */
export const headingInView = (container: HTMLElement, top: number): string | undefined => {
  let found: string | undefined
  for (const heading of container.querySelectorAll(HEADING_SELECTOR)) {
    if (heading.getBoundingClientRect().top > top + HEADING_IN_VIEW_SLACK) break
    const text = heading.textContent?.trim()
    if (text) found = text
  }
  return found
}

/** The first heading in `container` with the text `text` (as `nearestHeading` gives it): where a quote's heading is. */
export const findHeading = (container: HTMLElement, text: string): HTMLElement | null =>
  [...container.querySelectorAll<HTMLElement>(HEADING_SELECTOR)].find((heading) => heading.textContent?.trim() === text) ?? null

/**
 * The physical, 1-based PDF page of a node in pdf.js's viewer: the `data-page-number` of the page container around it.
 * Undefined outside a page (e.g. in the gap between pages).
 */
export const pdfPageOf = (node: Node): number | undefined => {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  const page = Number(element?.closest<HTMLElement>('.page[data-page-number]')?.dataset.pageNumber)
  return Number.isInteger(page) && page > 0 ? page : undefined
}

/**
 * The quote for the current selection, or null when nothing is selected or the selection does not lie fully inside
 * `container` (the file content, not the viewer's toolbar). The text is trimmed and cut to `MAX_QUOTE_LENGTH`.
 * `pageOf` gives the PDF page of the selection's start node; Markdown headings come from the rendered DOM.
 */
export const selectionToQuote = (
  selection: Selection | null,
  container: HTMLElement,
  path: string,
  { pageOf }: { pageOf?: (node: Node) => number | undefined } = {},
): PendingQuote | null => {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return null

  const text = selection.toString().trim()
  if (!text) return null
  const truncated = text.length > MAX_QUOTE_LENGTH
  const page = pageOf?.(range.startContainer)
  const heading = page === undefined ? nearestHeading(container, range.startContainer) : undefined
  return {
    quote: {
      kind: 'text',
      path,
      ...(page !== undefined ? { page } : {}),
      ...(heading ? { heading } : {}),
      text: truncated ? text.slice(0, MAX_QUOTE_LENGTH).trimEnd() : text,
    },
    truncated,
  }
}
