import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { emptyCheckpoint, MemorySaver } from '@langchain/langgraph'
import { afterEach, describe, expect, test } from 'vitest'
import { clearFailedRuns, keepFailedRun, readResumeState, takeFailedRun } from './resumableRuns'

const saveCheckpoint = async (messages: unknown[], pendingResults: ToolMessage[] = []) => {
  const saver = new MemorySaver()
  const checkpoint = { ...emptyCheckpoint(), channel_values: { messages } }
  const config = await saver.put({ configurable: { thread_id: 'run', checkpoint_ns: '' } }, checkpoint, { source: 'loop', step: 1, parents: {} })
  if (pendingResults.length > 0) {
    await saver.putWrites(
      config,
      pendingResults.map((result) => ['messages', result]),
      'task',
    )
  }
  return saver
}

const calls = (...ids: string[]) => ids.map((id) => ({ id, name: 'read_file', args: {}, type: 'tool_call' as const }))

afterEach(() => clearFailedRuns())

describe('readResumeState', () => {
  test('a failed model call has no pending tool calls; earlier turns are not counted', async () => {
    const saver = await saveCheckpoint([
      new HumanMessage('earlier'),
      new AIMessage({ content: '', tool_calls: calls('old') }),
      new ToolMessage({ content: 'x', tool_call_id: 'old', name: 'read_file' }),
      new AIMessage('earlier answer'),
      new HumanMessage('now'),
      new AIMessage({ content: '', tool_calls: calls('a', 'b') }),
      new ToolMessage({ content: 'a', tool_call_id: 'a', name: 'read_file' }),
      new ToolMessage({ content: 'b', tool_call_id: 'b', name: 'read_file' }),
    ])

    const state = await readResumeState(saver, 'run')
    expect(state).toEqual({ modelCalls: 1, toolCalls: new Map([['read_file', 2]]), pendingCallIds: [] })
  })

  test('tool calls without a result are pending, unless their result is a pending write', async () => {
    const saver = await saveCheckpoint(
      [new HumanMessage('now'), new AIMessage({ content: '', tool_calls: calls('a', 'b', 'c') })],
      [new ToolMessage({ content: 'a', tool_call_id: 'a', name: 'read_file' })],
    )

    const state = await readResumeState(saver, 'run')
    expect(state.pendingCallIds).toEqual(['b', 'c'])
    expect(state.toolCalls.get('read_file')).toBe(1)
  })
})

describe('failed runs', () => {
  test('keeps only the latest failed run of a user, and gives it out once', () => {
    const first = new MemorySaver()
    const second = new MemorySaver()
    keepFailedRun('user', 'run-1', first)
    keepFailedRun('user', 'run-2', second)

    expect(takeFailedRun('user', 'run-1')).toBeNull()
    expect(takeFailedRun('other-user', 'run-2')).toBeNull()
    expect(takeFailedRun('user', 'run-2')).toBe(second)
    expect(takeFailedRun('user', 'run-2')).toBeNull()
  })
})
