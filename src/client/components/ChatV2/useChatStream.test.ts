import { renderHook, act } from '@testing-library/react'
import { useChatStream, TypedAbortController } from './useChatStream'
import type { StreamAbortReason } from './useChatStream'
import { describe, test, expect, vi } from 'vitest'
import { parseStreamChunk } from './useChatStream'

const generationInfo = {
  model: 'gpt-4o' as const,
  promptInfo: { type: 'custom' as const, systemMessage: 'test' },
}

describe('Stream chunk parsing parses', () => {
  test('WritingEvent', () => {
    const result = parseStreamChunk('{"type": "writing", "text": "hello"}', '')
    expect(result).toEqual({
      parsed: {
        text: 'hello',
        type: 'writing',
      },
      accumulated: '',
    })
  })
  test('ErrorEvent', () => {
    const result = parseStreamChunk('{"type": "error", "error": "something went wrong"}', '')
    expect(result).toEqual({
      parsed: {
        type: 'error',
        error: 'something went wrong',
      },
      accumulated: '',
    })
  })
  test('ProcessingEvent', () => {
    const result = parseStreamChunk('{"type": "processing", "message": "working..."}', '')
    expect(result).toEqual({
      parsed: {
        type: 'processing',
        message: 'working...',
      },
      accumulated: '',
    })
  })
  test('concatenates if chunk is cut in the middle', () => {
    const chunk1 = parseStreamChunk('{"type":"writ', '')
    const chunk2 = parseStreamChunk('ing", "text":"hello"}', chunk1.accumulated)
    expect(chunk1).toEqual({
      parsed: undefined,
      accumulated: '{"type":"writ',
    })
    expect(chunk2).toEqual({
      parsed: {
        text: 'hello',
        type: 'writing',
      },
      accumulated: '',
    })
  })
})

describe('ChatStream', () => {
  test('clears error timeout when receiving writing event after error', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
        onToolCallComplete: vi.fn(),
      }),
    )

    const errorStream = makeStream(['{"type":"error", "error":"something failed"}'])
    await act(() => result.current.processStream(errorStream, generationInfo))

    const writingStream = makeStream(['{"type":"writing", "text":"hello"}'])
    await act(() => result.current.processStream(writingStream, generationInfo))

    expect(onComplete).toHaveBeenLastCalledWith({ message: expect.objectContaining({ content: 'hello' }) })
    vi.useRealTimers()
  })

  test('writing event accumulates completion', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
        onToolCallComplete: vi.fn(),
      }),
    )

    const stream = makeStream(['{"type":"writing", "text":"hello"}'])

    await act(() => result.current.processStream(stream, generationInfo))

    expect(onComplete).toHaveBeenCalledWith({ message: expect.objectContaining({ content: 'hello' }) })
  })
  //TODO: This should probably cause an error, cut stream now silently fails:
  test('cut stream', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
        onToolCallComplete: vi.fn(),
      }),
    )
    const stream = makeStream(['{"type":"writ'])
    await act(() => result.current.processStream(stream, generationInfo))
    expect(onComplete).toHaveBeenCalled()
  })

  test('a processing event', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
        onToolCallComplete: vi.fn(),
      }),
    )
    const stream = makeStream(['{"type":"processing", "message": "hello"} '])
    await act(() => result.current.processStream(stream, generationInfo))
    expect(onComplete).toHaveBeenCalledWith({ message: expect.objectContaining({ content: '' }) })
  })

  test('a toolCallStatus event without result', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
        onToolCallComplete: vi.fn(),
      }),
    )
    const stream = makeStream(['{"type":"toolCallStatus", "callId": "c1", "toolName": "document_search", "text": "hello"} '])
    await act(() => result.current.processStream(stream, generationInfo))
    expect(onComplete).toHaveBeenCalled()
  })

  test('a toolCallStatus event with result', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
        onToolCallComplete: vi.fn(),
      }),
    )
    const stream = makeStream(['{"type":"toolCallStatus", "callId": "c1", "toolName": "document_search", "text": "hello", "result":{"files":[]}}'])
    await act(() => result.current.processStream(stream, generationInfo))
    expect(onComplete).toHaveBeenCalled()
  })

  test('ErrorEvent sets error timeout', async () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
        onToolCallComplete: vi.fn(),
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
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn(), onToolCallComplete: vi.fn() }))
    await act(() => result.current.processStream(makeErrorStream(new Error('network error')), generationInfo))
    expect(onError).toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })

  test('non-abort stream error with prior content calls onError and onComplete', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn(), onToolCallComplete: vi.fn() }))
    const stream = makeErrorStream(new Error('network error'), ['{"type":"writing","text":"hello"}'])
    await act(() => result.current.processStream(stream, generationInfo))
    expect(onError).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledWith({ message: expect.objectContaining({ content: 'hello' }) })
  })

  test('AbortError with user_aborted calls onComplete', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn(), onToolCallComplete: vi.fn() }))
    const controller = new TypedAbortController<StreamAbortReason>()
    controller.abort('user_aborted')
    result.current.streamControllerRef.current = controller
    await act(() => result.current.processStream(makeErrorStream(makeAbortError()), generationInfo))
    expect(onComplete).toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  test('AbortError with conversation_cleared clears completion', async () => {
    const onComplete = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn(), onToolCallComplete: vi.fn() }))
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
    const { result } = renderHook(() => useChatStream({ onComplete, onError, onText: vi.fn(), onToolCallComplete: vi.fn() }))
    const controller = new TypedAbortController<StreamAbortReason>()
    controller.abort('timeout_error')
    result.current.streamControllerRef.current = controller
    await act(() => result.current.processStream(makeErrorStream(makeAbortError()), generationInfo))
    expect(onComplete).toHaveBeenCalledWith({ message: expect.objectContaining({ error: 'timeout_error' }) })
    expect(onError).not.toHaveBeenCalled()
  })

  test('default case', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useChatStream({
        onComplete,
        onError: vi.fn(),
        onText: vi.fn(),
        onToolCallComplete: vi.fn(),
      }),
    )
    const stream = makeStream(['{"type":"Some other case", "message": "hello"} '])
    await act(() => result.current.processStream(stream, generationInfo))
    expect(onComplete).toHaveBeenCalled()
  })
})

function makeErrorStream(error: Error, priorLines: string[] = []): ReadableStream {
  const encoder = new TextEncoder()
  let index = 0
  return new ReadableStream({
    pull(controller) {
      if (index < priorLines.length) {
        controller.enqueue(encoder.encode(priorLines[index++] + '\n'))
      } else {
        controller.error(error)
      }
    },
  })
}

function makeAbortError() {
  const err = new Error('aborted')
  err.name = 'AbortError'
  return err
}

function makeStream(lines: string[]): ReadableStream {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'))
      }
      controller.close()
    },
  })
}
