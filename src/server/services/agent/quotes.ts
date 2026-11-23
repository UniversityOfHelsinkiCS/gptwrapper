import type { Quote } from '@shared/quote'

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

/** A user message's text with its quotes before it, or just the text without quotes. */
export const withQuotes = (text: string, quotes: Quote[] | undefined): string => {
  if (!quotes?.length) return text
  const quoted = quotesToModelText(quotes)
  return text ? `${quoted}\n\n${text}` : quoted
}
