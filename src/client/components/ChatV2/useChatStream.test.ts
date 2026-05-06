import { renderHook, act } from '@testing-library/react'
import { useChatStream } from './useChatStream'
import { describe, test, expect, vi } from 'vitest'
import { parseStreamChunk } from './useChatStream'

const generationInfo = {
  model: 'gpt-4o' as const,
  promptInfo: { type: 'custom' as const, systemMessage: 'test' },
}

const makeStream = (lines: string[]): ReadableStream => {
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
})
