import { describe, expect, test } from 'vitest'
import type { AssistantPart, ChatEvent } from '../../../shared/agentChat'
import { applyEvent, finishReasoning } from './applyEvent'

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
    expect(applyEvent(parts, { type: 'subagent.start', path: [], callId: 'c1' } as any)).toBe(parts)
  })
})

const files = (fileName: string) => ({ files: [{ fileName }] })

describe('applyEvent with tool events', () => {
  test('multitool: two calls of one turn stay in call order between the text before and after them', () => {
    // The order the v4 stream sends a `multitool` run in: both calls start, they finish in any order, then the answer.
    const events: ChatEvent[] = [
      { type: 'text.delta', path: [], text: 'Let me search.' },
      { type: 'tool.start', path: [], callId: 'mock_multitool_1', name: 'document_search', input: { query: 'first' } },
      { type: 'tool.start', path: [], callId: 'mock_multitool_2', name: 'document_search', input: { query: 'second' } },
      { type: 'tool.end', path: [], callId: 'mock_multitool_2', status: 'ok', result: files('b.pdf') },
      { type: 'tool.end', path: [], callId: 'mock_multitool_1', status: 'ok', result: files('a.pdf') },
      { type: 'text.delta', path: [], text: 'Found ' },
      { type: 'text.delta', path: [], text: 'both.' },
    ]

    expect(events.reduce(applyEvent, [])).toEqual([
      { type: 'text', text: 'Let me search.' },
      { type: 'tool', callId: 'mock_multitool_1', name: 'document_search', input: { query: 'first' }, status: 'ok', result: files('a.pdf') },
      { type: 'tool', callId: 'mock_multitool_2', name: 'document_search', input: { query: 'second' }, status: 'ok', result: files('b.pdf') },
      { type: 'text', text: 'Found both.' },
    ])
  })

  test('a started tool is running until it ends; progress is kept only while it runs', () => {
    const started = applyEvent([], { type: 'tool.start', path: [], callId: 'c1', name: 'document_search', input: { query: 'q' } })
    expect(started).toEqual([{ type: 'tool', callId: 'c1', name: 'document_search', input: { query: 'q' }, status: 'running' }])

    const progressed = applyEvent(started, { type: 'tool.progress', path: [], callId: 'c1', data: { step: 1 } })
    expect(progressed[0]).toMatchObject({ status: 'running', progress: { step: 1 } })

    const ended = applyEvent(progressed, { type: 'tool.end', path: [], callId: 'c1', status: 'error', result: 'failed' })
    expect(ended).toEqual([{ type: 'tool', callId: 'c1', name: 'document_search', input: { query: 'q' }, status: 'error', result: 'failed' }])
  })

  test('a duplicate start, or progress and end of an unknown call, change nothing', () => {
    const parts = applyEvent([], { type: 'tool.start', path: [], callId: 'c1', name: 'document_search', input: {} })

    expect(applyEvent(parts, { type: 'tool.start', path: [], callId: 'c1', name: 'document_search', input: {} })).toBe(parts)
    expect(applyEvent(parts, { type: 'tool.progress', path: [], callId: 'other', data: 1 })).toBe(parts)
    expect(applyEvent(parts, { type: 'tool.end', path: [], callId: 'other', status: 'ok', result: null })).toBe(parts)
  })

  test('tool events of a subagent (non-empty path) are ignored for now', () => {
    const parts: AssistantPart[] = []
    expect(applyEvent(parts, { type: 'tool.start', path: ['call_1'], callId: 'c2', name: 'document_search', input: {} })).toBe(parts)
  })
})

describe('applyEvent reasoning', () => {
  const reasoning = (text: string): ChatEvent => ({ type: 'reasoning.delta', path: [], text })
  const text = (t: string): ChatEvent => ({ type: 'text.delta', path: [], text: t })

  test('reasoning deltas build one reasoning part, timed from its first delta', () => {
    const parts = applyEvent(applyEvent([], reasoning('Hmm'), 1000), reasoning(', ok'), 1500)
    expect(parts).toEqual([{ type: 'reasoning', text: 'Hmm, ok', startedAt: 1000 }])
  })

  test('the first text delta ends the thinking and records how long it took', () => {
    const parts = applyEvent(applyEvent([], reasoning('Hmm'), 1000), text('Answer'), 4200)
    expect(parts).toEqual([
      { type: 'reasoning', text: 'Hmm', durationMs: 3200 },
      { type: 'text', text: 'Answer' },
    ])
  })

  test('a tool call ends the thinking, and reasoning after it is a new part', () => {
    const events: [ChatEvent, number][] = [
      [reasoning('Search first.'), 0],
      [{ type: 'tool.start', path: [], callId: 'c1', name: 'document_search', input: {} }, 1000],
      [{ type: 'tool.end', path: [], callId: 'c1', status: 'ok', result: null }, 2000],
      [reasoning('Found it.'), 3000],
      [text('It is on Monday.'), 5000],
    ]
    const parts = events.reduce<AssistantPart[]>((acc, [event, now]) => applyEvent(acc, event, now), [])

    expect(parts).toEqual([
      { type: 'reasoning', text: 'Search first.', durationMs: 1000 },
      { type: 'tool', callId: 'c1', name: 'document_search', input: {}, status: 'ok', result: null },
      { type: 'reasoning', text: 'Found it.', durationMs: 2000 },
      { type: 'text', text: 'It is on Monday.' },
    ])
  })

  test('empty and subagent reasoning deltas change nothing', () => {
    const parts: AssistantPart[] = []
    expect(applyEvent(parts, reasoning(''))).toBe(parts)
    expect(applyEvent(parts, { type: 'reasoning.delta', path: ['call_1'], text: 'sub' })).toBe(parts)
  })

  test('finishReasoning ends a reasoning part left open when the stream stops', () => {
    const open = applyEvent([], reasoning('Hmm'), 1000)
    expect(finishReasoning(open, 2500)).toEqual([{ type: 'reasoning', text: 'Hmm', durationMs: 1500 }])

    const done: AssistantPart[] = [{ type: 'text', text: 'Answer' }]
    expect(finishReasoning(done, 2500)).toBe(done)
  })
})
