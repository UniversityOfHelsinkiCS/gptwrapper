// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { load } from '@langchain/core/load'
import { AIMessageChunk, ToolMessage } from '@langchain/core/messages'
import { describe, expect, test } from 'vitest'
import type { ChatEvent } from '@shared/agentChat'
import { getMainAgentModelCall, mapStreamChunk, namespaceToPath, type ModelCallSummary, type StreamChunk } from './mapStreamChunk'

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

const eventsOf = (tuples: StreamChunk[]): ChatEvent[] => tuples.flatMap(mapStreamChunk)

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

  test('emits only the final answer of a tool run, not the tool call or tool result', async () => {
    const events = eventsOf(await loadFixture('azure-tool'))

    expect(textOf(events)).toBe('The exam is on 12 December in Hall A.')
    expect(events.every((e) => e.type === 'text.delta' && e.path.length === 0)).toBe(true)
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

  test('joins several text parts of one chunk and ignores the functionCall chunk', async () => {
    const events = eventsOf(await loadFixture('vertex-replay-tool'))

    expect(events).toEqual([
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

  test('ignores tool messages, updates and custom chunks', () => {
    const toolMessage = new ToolMessage({ content: 'search results', tool_call_id: 'call-1' })

    expect(mapStreamChunk([['tools:t1'], 'messages', [toolMessage, {}]])).toEqual([])
    expect(mapStreamChunk([[], 'updates', { model_request: { messages: [chunk] } }])).toEqual([])
    expect(mapStreamChunk([['tools:t1'], 'custom', { progress: 50 }])).toEqual([])
  })

  test('does not count model calls of an agent running inside a tool', () => {
    const subagentCall = new AIMessageChunk({ content: 'x', usage_metadata: { input_tokens: 5, output_tokens: 5, total_tokens: 10 } })

    expect(getMainAgentModelCall([['tools:t1'], 'updates', { model_request: { messages: [subagentCall] } }])).toBeNull()
    expect(getMainAgentModelCall([[], 'updates', { model_request: { messages: [subagentCall] } }])).toEqual({ inputTokens: 5, outputTokens: 5, toolCalls: [] })
  })
})
