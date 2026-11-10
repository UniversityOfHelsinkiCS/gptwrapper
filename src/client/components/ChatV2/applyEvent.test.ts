import { describe, expect, test } from 'vitest'
import type { AssistantPart } from '../../../shared/agentChat'
import { applyEvent } from './applyEvent'

describe('applyEvent', () => {
  test('first text delta creates a text part', () => {
    expect(applyEvent([], { type: 'text.delta', path: [], text: 'Hel' })).toEqual([{ type: 'text', text: 'Hel' }])
  })

  test('text deltas append to the last text part', () => {
    const parts = applyEvent(applyEvent([], { type: 'text.delta', path: [], text: 'Hel' }), { type: 'text.delta', path: [], text: 'lo' })
    expect(parts).toEqual([{ type: 'text', text: 'Hello' }])
  })

  test('does not mutate the previous parts', () => {
    const before: AssistantPart[] = [{ type: 'text', text: 'Hel' }]
    const after = applyEvent(before, { type: 'text.delta', path: [], text: 'lo' })
    expect(before).toEqual([{ type: 'text', text: 'Hel' }])
    expect(after).not.toBe(before)
  })

  test('an empty text delta changes nothing', () => {
    const parts: AssistantPart[] = []
    expect(applyEvent(parts, { type: 'text.delta', path: [], text: '' })).toBe(parts)
  })

  test('subagent text (non-empty path) is ignored for now', () => {
    const parts: AssistantPart[] = [{ type: 'text', text: 'Main' }]
    expect(applyEvent(parts, { type: 'text.delta', path: ['call_1'], text: 'sub' })).toBe(parts)
  })

  test('usage, processing and error events do not add parts', () => {
    const parts: AssistantPart[] = [{ type: 'text', text: 'Main' }]
    expect(applyEvent(parts, { type: 'usage', inputTokens: 10, outputTokens: 5 })).toBe(parts)
    expect(applyEvent(parts, { type: 'processing' })).toBe(parts)
    expect(applyEvent(parts, { type: 'error', error: 'boom' })).toBe(parts)
  })

  test('unknown event types are ignored', () => {
    const parts: AssistantPart[] = [{ type: 'text', text: 'Main' }]
    expect(applyEvent(parts, { type: 'tool.start', path: [] } as any)).toBe(parts)
  })
})
