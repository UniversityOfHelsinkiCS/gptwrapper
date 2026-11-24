import type { Quote } from '@shared/quote'
import type { ViewerFile } from '@shared/viewerFile'

/** Keeps quoted text (which can come from any PDF or file) from closing its delimiter early. */
const escapeQuoteText = (text: string) => text.replace(/<\/?quote>/gi, (tag) => tag.replace('<', '&lt;'))

const quoteSource = (quote: Quote): string => {
  if (quote.page) return `, page ${quote.page}`
  if (quote.heading) return `, section "${quote.heading}"`
  return ''
}

/**
 * The quotes of a user message as the model gets them, before the question: delimited and marked as quoted material,
 * so instructions inside a quoted file are not taken as the student's.
 */
export const quotesToModelText = (quotes: Quote[]): string =>
  quotes
    .map((quote) => `The student quoted this from their file "${quote.path}"${quoteSource(quote)}:\n<quote>\n${escapeQuoteText(quote.text)}\n</quote>`)
    .join('\n\n')

/**
 * The line naming the file the student had open in the viewer. The path and heading come from the student's files, so
 * they are escaped like quoted text.
 */
export const viewerFileToModelText = (file: ViewerFile): string => {
  const position = file.page ? `, at page ${file.page}` : file.heading ? `, at section "${escapeQuoteText(file.heading)}"` : ''
  return `The student has "${escapeQuoteText(file.path)}" open in the file viewer${position}.`
}

/** What goes before the question of a user message: the open file, then the quotes. Empty without either. */
export const userMessagePreamble = (quotes: Quote[] | undefined, viewerFile: ViewerFile | undefined): string =>
  [viewerFile ? viewerFileToModelText(viewerFile) : '', quotes?.length ? quotesToModelText(quotes) : ''].filter(Boolean).join('\n\n')

/** A user message's text with the open file and its quotes before it, or just the text without them. */
export const withQuotes = (text: string, quotes: Quote[] | undefined, viewerFile?: ViewerFile): string => {
  const preamble = userMessagePreamble(quotes, viewerFile)
  if (!preamble) return text
  return text ? `${preamble}\n\n${text}` : preamble
}
