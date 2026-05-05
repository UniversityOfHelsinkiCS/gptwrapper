import { describe, test, expect } from 'vitest'
import { parseStreamChunk } from './useChatStream'
import type { ChatEvent } from '../../../shared/chat'

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
