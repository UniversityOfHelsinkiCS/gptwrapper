import { describe, expect, test } from 'vitest'
import { describeGenerationError } from './generationError'

describe('describeGenerationError', () => {
  test('appends the error message', () => {
    expect(describeGenerationError(new Error('429 Rate limit reached'))).toBe('Error while generating response: 429 Rate limit reached')
  })

  test('falls back to the generic message without a message', () => {
    expect(describeGenerationError(new Error(''))).toBe('Error while generating response')
    expect(describeGenerationError({ code: 500 })).toBe('Error while generating response')
  })

  test('shortens long messages', () => {
    const described = describeGenerationError(new Error('x'.repeat(2000)))
    expect(described.length).toBeLessThan(600)
    expect(described.endsWith('…')).toBe(true)
  })
})
