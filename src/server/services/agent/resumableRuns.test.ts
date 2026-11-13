import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { emptyCheckpoint, MemorySaver } from '@langchain/langgraph'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('../../util/redis', async () => (await import('../../tests/fakeRedis')).fakeRedisModule())
vi.mock('../../util/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { fakeRedisStore } from '../../tests/fakeRedis'
import { redisClient } from '../../util/redis'
import { clearLocalRuns, keepFailedRun, MAX_STORED_RUN_LENGTH, readResumeState, takeFailedRun } from './resumableRuns'

const saveCheckpoint = async (messages: unknown[], pendingResults: ToolMessage[] = [], threadId = 'run') => {
  const saver = new MemorySaver()
  const checkpoint = { ...emptyCheckpoint(), channel_values: { messages } }
  const config = await saver.put({ configurable: { thread_id: threadId, checkpoint_ns: '' } }, checkpoint, { source: 'loop', step: 1, parents: {} })
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

/** The fake client's `isReady` is a plain property (read-only on the real client). */
const setRedisReady = (ready: boolean) => {
  ;(redisClient as { isReady: boolean }).isReady = ready
}

const pendingRun = (runId: string) =>
  saveCheckpoint(
    [new HumanMessage('now'), new AIMessage({ content: '', tool_calls: calls('a', 'b') })],
    [new ToolMessage({ content: 'a', tool_call_id: 'a', name: 'read_file' })],
    runId,
  )

afterEach(() => {
  clearLocalRuns()
  fakeRedisStore.clear()
  setRedisReady(true)
})

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
    expect(state).toEqual({
      modelCalls: 1,
      toolCalls: new Map([['read_file', 2]]),
      pendingCallIds: [],
      startedCallIds: ['a', 'b'],
      endedCallIds: ['a', 'b'],
    })
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
  test('are stored in Redis, so another server can continue them from the same state', async () => {
    const original = await pendingRun('run-1')
    await keepFailedRun('user', 'run-1', original)
    expect(fakeRedisStore.has('failed-agent-run:user')).toBe(true)

    const restored = await takeFailedRun('user', 'run-1')
    expect(restored).not.toBe(original)
    expect(restored).toBeInstanceOf(MemorySaver)
    expect(await readResumeState(restored as MemorySaver, 'run-1')).toEqual(await readResumeState(original, 'run-1'))
    expect((await readResumeState(restored as MemorySaver, 'run-1')).pendingCallIds).toEqual(['b'])
  })

  test('keeps only the latest failed run of a user, and gives it out once', async () => {
    await keepFailedRun('user', 'run-1', await pendingRun('run-1'))
    await keepFailedRun('user', 'run-2', await pendingRun('run-2'))

    expect(await takeFailedRun('user', 'run-1')).toBeNull()
    expect(await takeFailedRun('other-user', 'run-2')).toBeNull()
    // The older id did not take the newer run
    expect(await takeFailedRun('user', 'run-2')).toBeInstanceOf(MemorySaver)
    expect(await takeFailedRun('user', 'run-2')).toBeNull()
  })

  test('without Redis, the run is kept in this server', async () => {
    setRedisReady(false)
    const original = await pendingRun('run-1')
    await keepFailedRun('user', 'run-1', original)

    expect(fakeRedisStore.size).toBe(0)
    expect(await takeFailedRun('user', 'run-1')).toBe(original)
    expect(await takeFailedRun('user', 'run-1')).toBeNull()
  })

  test('a run too big for Redis is kept in this server', async () => {
    const original = await saveCheckpoint([new HumanMessage('x'.repeat(MAX_STORED_RUN_LENGTH))], [], 'run-1')
    await keepFailedRun('user', 'run-1', original)

    expect(fakeRedisStore.size).toBe(0)
    expect(await takeFailedRun('user', 'run-1')).toBe(original)
  })
})
