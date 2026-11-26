import z from 'zod/v4'

/** At most this many quotes on one user message. */
export const MAX_QUOTES = 3

/** A quote's text is cut to this many characters. */
export const MAX_QUOTE_LENGTH = 4000

/**
 * Text the student selected in a My files file and sent with a message (`UserMessage.quotes`). `path` is the full My
 * files path, `page` the physical 1-based PDF page, `heading` the nearest preceding Markdown heading.
 */
export const TextQuoteSchema = z.object({
  kind: z.literal('text'),
  path: z.string().min(1).max(1000),
  page: z.number().int().positive().optional(),
  heading: z.string().max(500).optional(),
  text: z.string().min(1).max(MAX_QUOTE_LENGTH),
})
// later: a `region` quote (a PDF page area as an image) joins this as a discriminated union.
export const QuoteSchema = TextQuoteSchema

export const QuotesSchema = z.array(QuoteSchema).max(MAX_QUOTES)

export type TextQuote = z.infer<typeof TextQuoteSchema>
export type Quote = z.infer<typeof QuoteSchema>

/** The selection actions that send a quote right away with a fixed request (`UserMessage.quickAction`). */
export const QuickActionSchema = z.enum(['explain', 'summarize', 'translate'])
export type QuickAction = z.infer<typeof QuickActionSchema>

/** The file name of a quote's path, without its folders. */
export const quoteFileName = (quote: Pick<Quote, 'path'>): string => quote.path.split('/').filter(Boolean).at(-1) ?? quote.path
