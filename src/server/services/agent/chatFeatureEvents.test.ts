// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Quote } from '@shared/quote'
import { featureEventsForMessage } from './chatFeatureEvents'

const quote: Quote = { kind: 'text', path: 'Course/notes.md', text: 'An eigenvector keeps its direction.' }

describe('featureEventsForMessage', () => {
  it('is only a chat send for a plain message', () => {
    expect(featureEventsForMessage({})).toEqual([{ feature: 'chat', action: 'send' }])
  })

  it('is only a chat send for an empty quote list', () => {
    expect(featureEventsForMessage({ quotes: [] })).toEqual([{ feature: 'chat', action: 'send' }])
  })

  it('adds ask_sent for quotes without a quick action', () => {
    expect(featureEventsForMessage({ quotes: [quote] })).toEqual([
      { feature: 'chat', action: 'send' },
      { feature: 'quote', action: 'ask_sent' },
    ])
  })

  it.each(['explain', 'summarize', 'translate'] as const)('adds the %s quick action', (quickAction) => {
    expect(featureEventsForMessage({ quotes: [quote], quickAction })).toEqual([
      { feature: 'chat', action: 'send' },
      { feature: 'quote', action: quickAction },
    ])
  })
})
