// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { load } from '@langchain/core/load'
import { AIMessageChunk, ToolMessage } from '@langchain/core/messages'
import { describe, expect, test } from 'vitest'
import type { ChatEvent } from '@shared/agentChat'
import {
  getMainAgentModelCall,
  INITIAL_STREAM_STATE,
  mapStreamChunk,
  mapStreamChunks,
  namespaceToPath,
  nextStreamState,
  type ModelCallSummary,
  type StreamChunk,
} from './mapStreamChunk'

/**
 * Fixtures are raw `agent.stream` tuples written by `scripts/captureAgentStreamFixtures.ts`.
 * - `azure-*`: captured from real gpt-5-mini runs on Azure (Responses API).
 * - `vertex-replay-*`: SYNTHETIC. Vertex could not be called (billing disabled on the GCP project), so these
 *   come from the real ChatGoogle + createAgent code fed a hand-written Gemini HTTP response. The LangChain
 *   side (string vs array content, thought parts, usage deltas) is real; the Gemini reply text is not.
 */
const loadFixture = async (name: string): Promise<StreamChunk[]> => {
  const raw = JSON.parse(readFileSync(path.join(import.meta.dirname, 'fixtures', `${name}.json`), 'utf8')) as { tuples: unknown[] }
  // Revive the lc-serialised messages back into AIMessageChunk / ToolMessage instances, as in a live run.
  return (await load(JSON.stringify(raw.tuples))) as StreamChunk[]
}

const eventsOf = (tuples: StreamChunk[]): ChatEvent[] => mapStreamChunks(tuples)

const textOf = (events: ChatEvent[]) =>
  events
    .filter((e) => e.type === 'text.delta')
    .map((e) => e.text)
    .join('')

const sumUsage = (tuples: StreamChunk[]) =>
  tuples
    .map(getMainAgentModelCall)
    .filter((call): call is ModelCallSummary => call !== null)
    .reduce<ModelCallSummary & { calls: number }>(
      (sum, call) => ({
        calls: sum.calls + 1,
        inputTokens: sum.inputTokens + call.inputTokens,
        outputTokens: sum.outputTokens + call.outputTokens,
        toolCalls: [...sum.toolCalls, ...call.toolCalls],
      }),
      { calls: 0, inputTokens: 0, outputTokens: 0, toolCalls: [] },
    )

describe('mapStreamChunk with captured Azure runs', () => {
  test('streams a plain answer token by token as main-agent text deltas', async () => {
    const events = eventsOf(await loadFixture('azure-text'))

    expect(events.length).toBeGreaterThan(1)
    expect(events.every((e) => e.type === 'text.delta' && e.path.length === 0)).toBe(true)
    expect(textOf(events)).toBe("Hello. I'm here to help.")
  })

  test('a tool run is tool.start, tool.end and then the answer, all carrying the model tool call id', async () => {
    const events = eventsOf(await loadFixture('azure-tool'))
    const toolEvents = events.filter((e) => e.type !== 'text.delta')

    expect(toolEvents).toEqual([
      { type: 'tool.start', path: [], callId: 'call_gOesU3jKlx0iZmXJC7MxwThu', name: 'document_search', input: { query: expect.any(String) } },
      { type: 'tool.end', path: [], callId: 'call_gOesU3jKlx0iZmXJC7MxwThu', status: 'ok', result: [{ id: 'doc-1' }] },
    ])
    expect(events.findIndex((e) => e.type === 'tool.end')).toBeLessThan(events.findIndex((e) => e.type === 'text.delta'))
    expect(textOf(events)).toBe('The exam is on 12 December in Hall A.')
    expect(events.every((e) => e.type !== 'text.delta' || e.path.length === 0)).toBe(true)
  })

  test('does not emit tool.start from the streamed, still incomplete tool call chunks', async () => {
    const tuples = await loadFixture('azure-tool')
    const streamedCall = tuples.find(([, mode, data]) => mode === 'messages' && ((data as [AIMessageChunk])[0].tool_calls ?? []).length > 0)

    expect(streamedCall).toBeDefined()
    expect(mapStreamChunk(streamedCall!)).toEqual([])
  })

  test("learns the tool node's task id → tool call id from the tool message", async () => {
    const tuples = await loadFixture('azure-tool')
    const state = tuples.reduce(nextStreamState, INITIAL_STREAM_STATE)

    expect([...state.taskCallIds]).toEqual([['cf30dfa1-ca4d-512f-8bca-d4a1c5081eef', 'call_gOesU3jKlx0iZmXJC7MxwThu']])
    expect(namespaceToPath(['tools:cf30dfa1-ca4d-512f-8bca-d4a1c5081eef', 'model_request:x'], state)).toEqual(['call_gOesU3jKlx0iZmXJC7MxwThu'])
  })

  test('sums token usage over both model calls of a tool run', async () => {
    const usage = sumUsage(await loadFixture('azure-tool'))

    expect(usage).toEqual({ calls: 2, inputTokens: 86 + 225, outputTokens: 105 + 135, toolCalls: ['document_search'] })
  })
})

describe('mapStreamChunk with Gemini runs (synthetic Vertex replay)', () => {
  test('skips thought parts when a chunk has array content', async () => {
    const tuples = await loadFixture('vertex-replay-text')
    const first = tuples[0][2] as [AIMessageChunk]
    expect(Array.isArray(first[0].content)).toBe(true)

    const events = eventsOf(tuples)

    expect(events).toEqual([
      { type: 'text.delta', path: [], text: 'Hello there!' },
      { type: 'text.delta', path: [], text: ' Nice to meet you.' },
    ])
  })

  test('joins several text parts of one chunk; the functionCall becomes tool events, not text', async () => {
    const events = eventsOf(await loadFixture('vertex-replay-tool'))
    const callId = (events[0] as { callId: string }).callId

    expect(events).toEqual([
      { type: 'tool.start', path: [], callId, name: 'document_search', input: { query: 'exam date' } },
      { type: 'tool.end', path: [], callId, status: 'ok', result: [{ id: 'doc-1' }] },
      { type: 'text.delta', path: [], text: 'The exam is on 12 December' },
      { type: 'text.delta', path: [], text: ' in hall A.' },
    ])
  })

  test('sums usage over both model calls, thinking tokens included', async () => {
    const usage = sumUsage(await loadFixture('vertex-replay-tool'))

    expect(usage).toEqual({ calls: 2, inputTokens: 70 + 110, outputTokens: 73 + 11, toolCalls: ['document_search'] })
  })
})

describe('mapStreamChunk paths', () => {
  const chunk = new AIMessageChunk({ content: 'hi' })

  test('main agent text has an empty path, whatever node it came from', () => {
    expect(mapStreamChunk([['model_request:abc'], 'messages', [chunk, {}]])).toEqual([{ type: 'text.delta', path: [], text: 'hi' }])
  })

  test('text from an agent running inside a tool is nested under each tools segment', () => {
    expect(mapStreamChunk([['tools:outer', 'model_request:x', 'tools:inner', 'model_request:y'], 'messages', [chunk, {}]])).toEqual([
      { type: 'text.delta', path: ['outer', 'inner'], text: 'hi' },
    ])
    expect(namespaceToPath([])).toEqual([])
  })

  test('ignores streamed tool messages, model updates without tool calls and unknown custom chunks', () => {
    const toolMessage = new ToolMessage({ content: 'search results', tool_call_id: 'call-1' })

    expect(mapStreamChunk([['tools:t1'], 'messages', [toolMessage, {}]])).toEqual([])
    expect(mapStreamChunk([[], 'updates', { model_request: { messages: [chunk] } }])).toEqual([])
    expect(mapStreamChunk([['tools:t1'], 'custom', { progress: 50 }])).toEqual([])
  })
})

describe('mapStreamChunk tool events', () => {
  const twoCalls = new AIMessageChunk({
    content: '',
    tool_calls: [
      { name: 'document_search', args: { query: 'one' }, id: 'call_1', type: 'tool_call' },
      { name: 'document_search', args: { query: 'two' }, id: 'call_2', type: 'tool_call' },
    ],
  })

  test('one tool.start per tool call of a finished model call, in order', () => {
    expect(mapStreamChunk([[], 'updates', { model_request: { messages: [twoCalls] } }])).toEqual([
      { type: 'tool.start', path: [], callId: 'call_1', name: 'document_search', input: { query: 'one' } },
      { type: 'tool.start', path: [], callId: 'call_2', name: 'document_search', input: { query: 'two' } },
    ])
  })

  test('tool.end uses the artifact as the result when there is one, and the content otherwise', () => {
    const withArtifact = new ToolMessage({ content: 'chunk text', artifact: { files: [{ fileName: 'a.pdf' }] }, tool_call_id: 'call_1' })
    const plain = new ToolMessage({ content: 'plain result', tool_call_id: 'call_2' })

    expect(mapStreamChunk([[], 'updates', { tools: { messages: [withArtifact, plain] } }])).toEqual([
      { type: 'tool.end', path: [], callId: 'call_1', status: 'ok', result: { files: [{ fileName: 'a.pdf' }] } },
      { type: 'tool.end', path: [], callId: 'call_2', status: 'ok', result: 'plain result' },
    ])
  })

  test('a tool message with status error ends the call as failed', () => {
    const failed = new ToolMessage({ content: 'The tool failed.', tool_call_id: 'call_1', status: 'error' })

    expect(mapStreamChunk([[], 'updates', { tools: { messages: [failed] } }])).toEqual([
      { type: 'tool.end', path: [], callId: 'call_1', status: 'error', result: 'The tool failed.' },
    ])
  })

  test('tool.progress from writeToolProgress belongs to the agent that called the tool', () => {
    const progress: StreamChunk = [['tools:task-9'], 'custom', { type: 'tool.progress', callId: 'call_1', data: { step: 1 } }]
    const state = nextStreamState(INITIAL_STREAM_STATE, progress)

    expect(mapStreamChunk(progress, state)).toEqual([{ type: 'tool.progress', path: [], callId: 'call_1', data: { step: 1 } }])
    expect(namespaceToPath(['tools:task-9'], state)).toEqual(['call_1'])
  })

  test('nextStreamState returns the same state when it learns nothing new', () => {
    const text: StreamChunk = [['model_request:x'], 'messages', [new AIMessageChunk({ content: 'hi' }), {}]]
    expect(nextStreamState(INITIAL_STREAM_STATE, text)).toBe(INITIAL_STREAM_STATE)
  })

  test('does not count model calls of an agent running inside a tool', () => {
    const subagentCall = new AIMessageChunk({ content: 'x', usage_metadata: { input_tokens: 5, output_tokens: 5, total_tokens: 10 } })

    expect(getMainAgentModelCall([['tools:t1'], 'updates', { model_request: { messages: [subagentCall] } }])).toBeNull()
    expect(getMainAgentModelCall([[], 'updates', { model_request: { messages: [subagentCall] } }])).toEqual({ inputTokens: 5, outputTokens: 5, toolCalls: [] })
  })
})
