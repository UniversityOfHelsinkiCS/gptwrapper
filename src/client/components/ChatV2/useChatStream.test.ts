import { renderHook, act } from '@testing-library/react'
import { useChatStream, TypedAbortController } from './useChatStream'
import type { StreamAbortReason } from './useChatStream'
import { describe, test, expect, vi } from 'vitest'

vi.mock('../../util/apiClient', () => ({ postAbortableStream: vi.fn() }))
import { readNdjsonEvents } from './chatTransport'

const generationInfo = {
  model: 'gpt-5-mini' as const,
  promptInfo: { type: 'custom' as const, systemMessage: 'test' },
}

describe('ChatStream', () => {
  test('clears error timeout when receiving a text delta after error', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
      }),
    )

    const errorStream = makeStream(['{"type":"error", "error":"something failed"}'])
    await act(() => result.current.processStream(errorStream, generationInfo))

    const writingStream = makeStream(['{"type":"text.delta","path":[],"text":"hello"}'])
    await act(() => result.current.processStream(writingStream, generationInfo))

    expect(onComplete).toHaveBeenLastCalledWith({ message: expect.objectContaining({ parts: [{ type: 'text', text: 'hello' }] }) })
    vi.useRealTimers()
  })

  test('text deltas accumulate into a text part', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
      }),
    )

    const stream = makeStream(['{"type":"text.delta","path":[],"text":"hello"}'])

    await act(() => result.current.processStream(stream, generationInfo))

    expect(onComplete).toHaveBeenCalledWith({ message: expect.objectContaining({ parts: [{ type: 'text', text: 'hello' }] }) })
  })

  test('stream interrupted mid-chunk calls onError without onComplete', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn() }))
    const stream = makeErrorStream(new Error('network error'), ['{"type":"text.de'])
    await act(() => result.current.processStream(stream, generationInfo))
    expect(onError).toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })

  test('a processing event', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
      }),
    )
    const stream = makeStream(['{"type":"processing"} '])
    await act(() => result.current.processStream(stream, generationInfo))
    expect(onComplete).toHaveBeenCalledWith({ message: expect.objectContaining({ parts: [] }) })
  })

  test('ErrorEvent sets error timeout', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
      }),
    )

    const errorStream = makeStream(['{"type":"error", "error":"something failed"}'])
    await act(() => result.current.processStream(errorStream, generationInfo))
    vi.advanceTimersByTime(3001)

    expect(onComplete).toHaveBeenLastCalledWith({ message: expect.objectContaining({ error: 'something failed' }) })
    vi.useRealTimers()
  })

  test('non-abort stream error calls onError', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn() }))
    await act(() => result.current.processStream(makeErrorStream(new Error('network error')), generationInfo))
    expect(onError).toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })

  test('non-abort stream error with prior content calls onError and onComplete', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn() }))
    const stream = makeErrorStream(new Error('network error'), ['{"type":"text.delta","path":[],"text":"hello"}'])
    await act(() => result.current.processStream(stream, generationInfo))
    expect(onError).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledWith({ message: expect.objectContaining({ parts: [{ type: 'text', text: 'hello' }] }) })
  })

  test('AbortError with user_aborted calls onComplete', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn() }))
    const controller = new TypedAbortController<StreamAbortReason>()
    controller.abort('user_aborted')
    result.current.streamControllerRef.current = controller
    await act(() => result.current.processStream(makeErrorStream(makeAbortError()), generationInfo))
    expect(onComplete).toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  // Regression: Firefox rejects an aborted stream read with a TypeError rather than an
  // AbortError. A user-initiated stop must still be graceful (onComplete, not onError)
  // regardless of what error type the browser throws, because we own the abort signal.
  test('user_aborted is graceful even when the read rejects with a non-AbortError (Firefox)', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn() }))
    const controller = new TypedAbortController<StreamAbortReason>()
    controller.abort('user_aborted')
    result.current.streamControllerRef.current = controller
    await act(() => result.current.processStream(makeErrorStream(new TypeError('NetworkError when attempting to fetch resource.')), generationInfo))
    expect(onComplete).toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  test('AbortError with conversation_cleared clears completion', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn() }))
    const controller = new TypedAbortController<StreamAbortReason>()
    controller.abort('conversation_cleared')
    result.current.streamControllerRef.current = controller
    await act(() => result.current.processStream(makeErrorStream(makeAbortError()), generationInfo))
    expect(onComplete).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  test('AbortError with timeout_error calls onComplete with error', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn() }))
    const controller = new TypedAbortController<StreamAbortReason>()
    controller.abort('timeout_error')
    result.current.streamControllerRef.current = controller
    await act(() => result.current.processStream(makeErrorStream(makeAbortError()), generationInfo))
    expect(onComplete).toHaveBeenCalledWith({ message: expect.objectContaining({ error: 'timeout_error' }) })
    expect(onError).not.toHaveBeenCalled()
  })

  // An unknown event type is ignored: it must not crash and must add no content.
  test('unknown event type is ignored and adds no content', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
      }),
    )
    const stream = makeStream(['{"type":"Some other case", "message": "hello"} '])
    await act(() => result.current.processStream(stream, generationInfo))
    expect(onComplete).toHaveBeenCalledWith({ message: expect.objectContaining({ parts: [] }) })
  })
})

function makeErrorStream(error: Error, priorLines: string[] = []) {
  const encoder = new TextEncoder()
  let index = 0
  return readNdjsonEvents(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index < priorLines.length) {
          controller.enqueue(encoder.encode(priorLines[index++] + '\n'))
        } else {
          controller.error(error)
        }
      },
    }),
  )
}

function makeAbortError() {
  const err = new Error('aborted')
  err.name = 'AbortError'
  return err
}

function makeStream(lines: string[]) {
  const encoder = new TextEncoder()
  return readNdjsonEvents(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line + '\n'))
        }
        controller.close()
      },
    }),
  )
}

describe('ChatStream v4 events', () => {
  test('builds the message from text deltas and clears the streaming parts afterwards', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError: vi.fn(), onText: vi.fn() }))
    async function* events() {
      yield { type: 'text.delta' as const, path: [], text: 'Hel' }
      yield { type: 'text.delta' as const, path: [], text: 'lo' }
      yield { type: 'usage' as const, inputTokens: 3, outputTokens: 2 }
    }
    await act(() => result.current.processStream(events(), generationInfo))

    expect(onComplete).toHaveBeenCalledWith({ message: { role: 'assistant', parts: [{ type: 'text', text: 'Hello' }], error: undefined, generationInfo } })
    expect(result.current.streamingParts).toEqual([])
  })

  test('every event re-arms the stream timeout, processing included', async () => {
    const onText = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete: vi.fn(), onError: vi.fn(), onText }))
    await act(() => result.current.processStream(makeStream(['{"type":"processing"}', '{"type":"usage","inputTokens":1,"outputTokens":1}']), generationInfo))
    expect(onText).toHaveBeenCalledTimes(2)
  })

  test('an error event (e.g. content filter) reports once and ends with the error on the message', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn() }))
    const stream = makeStream(['{"type":"text.delta","path":[],"text":"partial"}', '{"type":"error","error":"content_filter"}'])
    await act(() => result.current.processStream(stream, generationInfo))
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith({ error: 'content_filter' })
    expect(onComplete).toHaveBeenCalledWith({ message: expect.objectContaining({ parts: [{ type: 'text', text: 'partial' }], error: 'content_filter' }) })
  })
})
