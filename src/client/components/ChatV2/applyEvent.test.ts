import { describe, expect, test } from 'vitest'
import type { AssistantPart, ChatEvent } from '../../../shared/agentChat'
import { applyEvent, finishParts, finishReasoning } from './applyEvent'

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

  test('text of a subagent that has not started is dropped', () => {
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
    expect(applyEvent(parts, { type: 'something.new', path: [], callId: 'c1' } as any)).toBe(parts)
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

  test('tool events of a subagent that has not started are dropped', () => {
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

  test('empty reasoning deltas, and those of a subagent that has not started, change nothing', () => {
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

describe('applyEvent subagents', () => {
  const SUB = 'call_sub'
  const start: ChatEvent = { type: 'subagent.start', path: [], callId: SUB, name: 'mock_subagent', task: 'Find the facts' }
  const reduce = (events: ChatEvent[], now = 0) => events.reduce<AssistantPart[]>((acc, event) => applyEvent(acc, event, now), [])

  test('nests the events of a subagent run by path, in the order they came, between the main text before and after it', () => {
    const parts = reduce([
      { type: 'text.delta', path: [], text: 'Let me ask.' },
      start,
      { type: 'text.delta', path: [SUB], text: 'Looking ' },
      { type: 'text.delta', path: [SUB], text: 'it up.' },
      { type: 'tool.start', path: [SUB], callId: 'lookup', name: 'mock_lookup', input: { query: 'facts' } },
      { type: 'tool.end', path: [SUB], callId: 'lookup', status: 'ok', result: 'found' },
      { type: 'text.delta', path: [SUB], text: 'Found 42.' },
      { type: 'subagent.end', path: [], callId: SUB, status: 'ok' },
      { type: 'text.delta', path: [], text: 'There are 42.' },
    ])

    expect(parts).toEqual([
      { type: 'text', text: 'Let me ask.' },
      {
        type: 'subagent',
        callId: SUB,
        name: 'mock_subagent',
        task: 'Find the facts',
        status: 'ok',
        parts: [
          { type: 'text', text: 'Looking it up.' },
          { type: 'tool', callId: 'lookup', name: 'mock_lookup', input: { query: 'facts' }, status: 'ok', result: 'found' },
          { type: 'text', text: 'Found 42.' },
        ],
      },
      { type: 'text', text: 'There are 42.' },
    ])
  })

  test('a subagent started inside a subagent nests one level deeper', () => {
    const parts = reduce([
      start,
      { type: 'subagent.start', path: [SUB], callId: 'deep', name: 'mock_subagent', task: 'Deeper' },
      { type: 'reasoning.delta', path: [SUB, 'deep'], text: 'Hmm' },
      { type: 'text.delta', path: [SUB, 'deep'], text: 'Deep answer' },
    ])

    expect(parts[0]).toMatchObject({
      type: 'subagent',
      status: 'running',
      parts: [
        {
          type: 'subagent',
          callId: 'deep',
          status: 'running',
          parts: [
            { type: 'reasoning', text: 'Hmm' },
            { type: 'text', text: 'Deep answer' },
          ],
        },
      ],
    })
  })

  test('changes nothing for a duplicate start, an unknown subagent or an event of a sibling', () => {
    const parts = reduce([start])

    expect(applyEvent(parts, start)).toBe(parts)
    expect(applyEvent(parts, { type: 'subagent.end', path: [], callId: 'other', status: 'ok' })).toBe(parts)
    expect(applyEvent(parts, { type: 'text.delta', path: ['other'], text: 'x' })).toBe(parts)
    expect(applyEvent(parts, { type: 'tool.end', path: [SUB], callId: 'unknown', status: 'ok', result: null })).toBe(parts)
  })

  test('only the subagent part on the path is replaced; other parts keep their identity', () => {
    const before = reduce([{ type: 'text.delta', path: [], text: 'Main' }, start])
    const after = applyEvent(before, { type: 'text.delta', path: [SUB], text: 'sub' })

    expect(after[0]).toBe(before[0])
    expect(after[1]).not.toBe(before[1])
    expect(before[1]).toMatchObject({ parts: [] })
  })

  test('a subagent that fails midway ends as failed, with what it left running failed and its thinking timed', () => {
    const events: [ChatEvent, number][] = [
      [start, 0],
      [{ type: 'text.delta', path: [SUB], text: 'Looking.' }, 0],
      [{ type: 'tool.start', path: [SUB], callId: 'lookup', name: 'mock_lookup', input: {} }, 0],
      [{ type: 'tool.progress', path: [SUB], callId: 'lookup', data: { step: 1 } }, 0],
      [{ type: 'subagent.end', path: [], callId: SUB, status: 'error' }, 1000],
      [{ type: 'text.delta', path: [], text: 'The subagent failed.' }, 1000],
    ]
    const parts = events.reduce<AssistantPart[]>((acc, [event, now]) => applyEvent(acc, event, now), [])

    expect(parts).toEqual([
      {
        type: 'subagent',
        callId: SUB,
        name: 'mock_subagent',
        task: 'Find the facts',
        status: 'error',
        parts: [
          { type: 'text', text: 'Looking.' },
          { type: 'tool', callId: 'lookup', name: 'mock_lookup', input: {}, status: 'error' },
        ],
      },
      { type: 'text', text: 'The subagent failed.' },
    ])
  })

  test('an error event in the middle of a subagent run stops the subagent and everything running in it, as failed', () => {
    const running = reduce(
      [
        start,
        { type: 'reasoning.delta', path: [SUB], text: 'Thinking' },
        { type: 'subagent.start', path: [SUB], callId: 'deep', name: 'mock_subagent', task: 'Deeper' },
        { type: 'tool.start', path: [SUB, 'deep'], callId: 'lookup', name: 'mock_lookup', input: {} },
      ],
      1000,
    )
    const stopped = applyEvent(running, { type: 'error', error: 'Error while generating response' }, 4000)

    expect(stopped).toEqual([
      {
        type: 'subagent',
        callId: SUB,
        name: 'mock_subagent',
        task: 'Find the facts',
        status: 'error',
        parts: [
          { type: 'reasoning', text: 'Thinking', durationMs: 0 },
          {
            type: 'subagent',
            callId: 'deep',
            name: 'mock_subagent',
            task: 'Deeper',
            status: 'error',
            parts: [{ type: 'tool', callId: 'lookup', name: 'mock_lookup', input: {}, status: 'error' }],
          },
        ],
      },
    ])
    // Finished parts stay as they were.
    expect(applyEvent(stopped, { type: 'error', error: 'again' })).toBe(stopped)
  })
})

describe('finishParts', () => {
  test('marks running tools and subagents, nested ones included, as error and times open reasoning', () => {
    const parts: AssistantPart[] = [
      { type: 'tool', callId: 'done', name: 'document_search', input: {}, status: 'ok', result: null },
      { type: 'tool', callId: 't1', name: 'document_search', input: {}, status: 'running', progress: { step: 1 } },
      {
        type: 'subagent',
        callId: 's1',
        name: 'mock_subagent',
        task: 'x',
        status: 'running',
        parts: [
          { type: 'tool', callId: 't2', name: 'mock_lookup', input: {}, status: 'running' },
          { type: 'subagent', callId: 's2', name: 'mock_subagent', task: 'y', status: 'running', parts: [{ type: 'reasoning', text: 'Hmm', startedAt: 1000 }] },
        ],
      },
    ]

    expect(finishParts(parts, 3000)).toEqual([
      { type: 'tool', callId: 'done', name: 'document_search', input: {}, status: 'ok', result: null },
      { type: 'tool', callId: 't1', name: 'document_search', input: {}, status: 'error' },
      {
        type: 'subagent',
        callId: 's1',
        name: 'mock_subagent',
        task: 'x',
        status: 'error',
        parts: [
          { type: 'tool', callId: 't2', name: 'mock_lookup', input: {}, status: 'error' },
          { type: 'subagent', callId: 's2', name: 'mock_subagent', task: 'y', status: 'error', parts: [{ type: 'reasoning', text: 'Hmm', durationMs: 2000 }] },
        ],
      },
    ])
  })

  test('ends open reasoning at the top level too, and returns finished parts unchanged', () => {
    expect(finishParts([{ type: 'reasoning', text: 'Hmm', startedAt: 1000 }], 2500)).toEqual([{ type: 'reasoning', text: 'Hmm', durationMs: 1500 }])

    const done: AssistantPart[] = [
      { type: 'subagent', callId: 's1', name: 'mock_subagent', task: 'x', status: 'ok', parts: [{ type: 'text', text: 'found' }] },
      { type: 'text', text: 'Answer' },
    ]
    expect(finishParts(done, 2500)).toBe(done)
    expect(finishParts([], 2500)).toEqual([])
  })
})
