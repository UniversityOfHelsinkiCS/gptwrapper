// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { ChatMessageSchema } from './chat'
import { MAX_QUOTE_LENGTH, quoteFileName } from './quote'

const quote = (overrides: Record<string, unknown> = {}) => ({
  kind: 'text',
  path: 'Course/week3/notes.md',
  heading: 'Eigenvalues',
  text: 'A quoted line',
  ...overrides,
})
const parse = (quotes: unknown) => ChatMessageSchema.safeParse({ role: 'user', content: 'What does this mean?', quotes })

describe('quotes in ChatMessageSchema', () => {
  it('accepts valid text quotes, with a page or a heading or neither', () => {
    expect(parse([quote()]).success).toBe(true)
    expect(parse([quote({ heading: undefined, page: 12 })]).success).toBe(true)
    expect(parse([quote({ heading: undefined })]).success).toBe(true)
    expect(parse([quote(), quote(), quote()]).success).toBe(true)
  })

  it('accepts a message without quotes', () => {
    expect(ChatMessageSchema.safeParse({ role: 'user', content: 'hi' }).success).toBe(true)
  })

  it('rejects more than 3 quotes', () => {
    expect(parse([quote(), quote(), quote(), quote()]).success).toBe(false)
  })

  it('rejects quote text over the maximum length, and empty text', () => {
    expect(parse([quote({ text: 'a'.repeat(MAX_QUOTE_LENGTH) })]).success).toBe(true)
    expect(parse([quote({ text: 'a'.repeat(MAX_QUOTE_LENGTH + 1) })]).success).toBe(false)
    expect(parse([quote({ text: '' })]).success).toBe(false)
  })

  it('rejects kinds other than text', () => {
    expect(parse([quote({ kind: 'region', page: 1, rect: [0, 0, 10, 10], image: 'data:image/png;base64,' })]).success).toBe(false)
  })

  it('rejects a page that is not a positive integer', () => {
    expect(parse([quote({ page: 0 })]).success).toBe(false)
    expect(parse([quote({ page: 1.5 })]).success).toBe(false)
  })
})

describe('quoteFileName', () => {
  it('is the last part of the path', () => {
    expect(quoteFileName({ path: 'Course/week3/notes.md' })).toBe('notes.md')
    expect(quoteFileName({ path: 'notes.txt' })).toBe('notes.txt')
  })
})
