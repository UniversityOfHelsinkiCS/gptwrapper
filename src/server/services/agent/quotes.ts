import type { Quote } from '@shared/quote'
import type { ViewerFile } from '@shared/viewerFile'

// The fixed parts of the preamble, shared with `splitUserMessagePreamble`.
const QUOTE_LEAD = 'The student quoted this from their file "'
const QUOTE_OPEN = ':\n<quote>\n'
const QUOTE_CLOSE = '\n</quote>'
const VIEWER_FILE_LEAD = 'The student has "'
const VIEWER_FILE_TAIL = '" open in the file viewer'
const SEPARATOR = '\n\n'

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
  quotes.map((quote) => `${QUOTE_LEAD}${quote.path}"${quoteSource(quote)}${QUOTE_OPEN}${escapeQuoteText(quote.text)}${QUOTE_CLOSE}`).join(SEPARATOR)

/**
 * The line naming the file the student had open in the viewer. The path and heading come from the student's files, so
 * they are escaped like quoted text.
 */
export const viewerFileToModelText = (file: ViewerFile): string => {
  const position = file.page ? `, at page ${file.page}` : file.heading ? `, at section "${escapeQuoteText(file.heading)}"` : ''
  return `${VIEWER_FILE_LEAD}${escapeQuoteText(file.path)}${VIEWER_FILE_TAIL}${position}.`
}

/** What goes before the question of a user message: the open file, then the quotes. Empty without either. */
export const userMessagePreamble = (quotes: Quote[] | undefined, viewerFile: ViewerFile | undefined): string =>
  [viewerFile ? viewerFileToModelText(viewerFile) : '', quotes?.length ? quotesToModelText(quotes) : ''].filter(Boolean).join(SEPARATOR)

/** A user message's text with the open file and its quotes before it, or just the text without them. */
export const withQuotes = (text: string, quotes: Quote[] | undefined, viewerFile?: ViewerFile): string => {
  const preamble = userMessagePreamble(quotes, viewerFile)
  if (!preamble) return text
  return text ? `${preamble}${SEPARATOR}${text}` : preamble
}

/** The length of the open-file line at the start of `content` (without its separator), or 0 when there is none. */
const viewerFileLineLength = (content: string): number => {
  if (!content.startsWith(VIEWER_FILE_LEAD)) return 0
  const end = content.indexOf('\n')
  const line = end === -1 ? content : content.slice(0, end)
  return line.includes(VIEWER_FILE_TAIL) && line.endsWith('.') ? line.length : 0
}

/** The length of the quote block at the start of `content` (without its separator), or 0 when there is none. */
const quoteBlockLength = (content: string): number => {
  if (!content.startsWith(QUOTE_LEAD)) return 0
  const open = content.indexOf(QUOTE_OPEN)
  // The quoted text has its tags escaped, so the first closing tag after the opening one ends the block.
  const close = open === -1 ? -1 : content.indexOf(QUOTE_CLOSE, open + QUOTE_OPEN.length)
  return close === -1 ? 0 : close + QUOTE_CLOSE.length
}

/**
 * Splits a user message as `withQuotes` makes it back into its preamble (the open file and the quotes) and the
 * student's own text. Without a preamble, it is all text.
 */
export const splitUserMessagePreamble = (content: string): { preamble: string; text: string } => {
  let end = viewerFileLineLength(content)
  for (;;) {
    const rest = end === 0 ? content : content.slice(end)
    const separator = end === 0 ? 0 : rest.startsWith(SEPARATOR) ? SEPARATOR.length : -1
    if (separator === -1) break
    const block = quoteBlockLength(rest.slice(separator))
    if (block === 0) break
    end += separator + block
  }
  if (end === 0) return { preamble: '', text: content }
  const rest = content.slice(end)
  if (rest === '') return { preamble: content, text: '' }
  if (!rest.startsWith(SEPARATOR)) return { preamble: '', text: content }
  return { preamble: content.slice(0, end), text: rest.slice(SEPARATOR.length) }
}
