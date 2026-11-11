import { afterEach, describe, expect, test, vi } from 'vitest'
import { createClientToolBridge, MAX_CLIENT_TOOL_ARTIFACT_CHARS, MAX_CLIENT_TOOL_CONTENT_CHARS, type ClientToolRequest } from './clientTools'

const setup = (timeoutMs = 1000) => {
  const sent: ClientToolRequest[] = []
  const bridge = createClientToolBridge({ send: (request) => sent.push(request), timeoutMs })
  return { bridge, sent }
}

const request = (callId = 'call_1'): ClientToolRequest => ({ callId, name: 'ls', input: { path: '' } })

afterEach(() => {
  vi.useRealTimers()
})

describe('client tool bridge', () => {
  test('sends the request and resolves with the matching result', async () => {
    const { bridge, sent } = setup()
    const result = bridge.call(request(), new AbortController().signal)

    expect(sent).toEqual([request()])
    expect(bridge.resolve('call_1', { status: 'ok', content: 'listing', artifact: { tool: 'ls' } })).toBe(true)
    expect(await result).toEqual({ status: 'ok', content: 'listing', artifact: { tool: 'ls' } })
    expect(bridge.pendingCount).toBe(0)
  })

  test('matches results by call id when several calls wait', async () => {
    const { bridge } = setup()
    const signal = new AbortController().signal
    const first = bridge.call(request('a'), signal)
    const second = bridge.call(request('b'), signal)

    bridge.resolve('b', { status: 'ok', content: 'second' })
    bridge.resolve('a', { status: 'error', error: 'first failed' })

    expect(await first).toEqual({ status: 'error', error: 'first failed' })
    expect(await second).toEqual({ status: 'ok', content: 'second' })
  })

  test('ignores results for unknown and already finished calls', async () => {
    const { bridge } = setup()
    const result = bridge.call(request(), new AbortController().signal)

    expect(bridge.resolve('other', { status: 'ok', content: 'not mine' })).toBe(false)
    expect(bridge.resolve('call_1', { status: 'ok', content: 'mine' })).toBe(true)
    expect(bridge.resolve('call_1', { status: 'ok', content: 'again' })).toBe(false)
    expect(await result).toEqual({ status: 'ok', content: 'mine' })
  })

  test('a call without a result in time ends as an error, and a late result is ignored', async () => {
    vi.useFakeTimers()
    const { bridge } = setup(5000)
    const result = bridge.call(request(), new AbortController().signal)

    await vi.advanceTimersByTimeAsync(5000)
    expect(await result).toEqual({ status: 'error', error: 'The browser did not answer within 5 s.' })
    expect(bridge.resolve('call_1', { status: 'ok', content: 'too late' })).toBe(false)
    expect(bridge.pendingCount).toBe(0)
  })

  test('close ends the waiting calls and every later call as errors', async () => {
    const { bridge, sent } = setup()
    const waiting = bridge.call(request('a'), new AbortController().signal)

    bridge.close()
    expect(await waiting).toEqual({ status: 'error', error: 'The connection to the browser closed.' })
    expect(await bridge.call(request('b'), new AbortController().signal)).toEqual({ status: 'error', error: 'The connection to the browser closed.' })
    expect(sent.map((r) => r.callId)).toEqual(['a'])
  })

  test('an aborted run rejects the waiting call', async () => {
    const { bridge } = setup()
    const controller = new AbortController()
    const result = bridge.call(request(), controller.signal)

    controller.abort(new Error('client_aborted'))
    await expect(result).rejects.toThrow('client_aborted')
    expect(bridge.pendingCount).toBe(0)
    expect(bridge.resolve('call_1', { status: 'ok', content: 'late' })).toBe(false)
  })

  test('a duplicate call id is refused without a second request', async () => {
    const { bridge, sent } = setup()
    const signal = new AbortController().signal
    void bridge.call(request(), signal)
    expect(await bridge.call(request(), signal)).toEqual({ status: 'error', error: 'This tool call is already running.' })
    expect(sent).toHaveLength(1)
  })

  test('caps the content and drops a too large artifact from the browser', async () => {
    const { bridge } = setup()
    const result = bridge.call(request(), new AbortController().signal)
    bridge.resolve('call_1', { status: 'ok', content: 'x'.repeat(MAX_CLIENT_TOOL_CONTENT_CHARS + 10), artifact: 'y'.repeat(MAX_CLIENT_TOOL_ARTIFACT_CHARS) })

    const answer = await result
    expect(answer.status).toBe('ok')
    if (answer.status !== 'ok') return
    expect(answer.content).toHaveLength(MAX_CLIENT_TOOL_CONTENT_CHARS + '\n[Result cut to fit the limit.]'.length)
    expect(answer.artifact).toBeUndefined()
  })
})
