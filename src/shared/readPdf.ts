/**
 * The `read_pdf` subagent (issue 14): the main agent hands it a PDF in My files and a task, and it reads the PDF with
 * the browser's read tools (`read_file`, `grep`, `ls`) on a model of its own, then answers briefly.
 */
export const READ_PDF = 'read_pdf'

/**
 * The `tool.progress` data of a `read_pdf` call, shown on its subagent card: the pages it is reading (the total once
 * it is known), or what it is searching for.
 */
export type ReadPdfProgress =
  | { action: 'read'; path: string; startPage?: number; endPage?: number; totalPages?: number }
  | { action: 'search'; path: string; pattern: string }

export const isReadPdfProgress = (data: unknown): data is ReadPdfProgress => {
  if (typeof data !== 'object' || data === null) return false
  const progress = data as Record<string, unknown>
  if (typeof progress.path !== 'string') return false
  return progress.action === 'read' || (progress.action === 'search' && typeof progress.pattern === 'string')
}
