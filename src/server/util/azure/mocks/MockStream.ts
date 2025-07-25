import { ApplicationError } from '../../ApplicationError'
import {
  getBasicStreamMock,
  getCodeBlockStreamMock,
  getFailedStreamMock,
  getFileSearchStreamMock,
  getIncompleteStreamMock,
  getMathBlockStreamMock,
  getMidwayFailStreamMock,
  MockEventType,
  type MockResponseStreamEvent,
} from './mockFunctions'

class MockStream<T> {
  private events: T[]
  private index = 0
  // For testing stream aborting
  controller = new AbortController()

  constructor(events: T[]) {
    this.events = events
  }

  async *[Symbol.asyncIterator]() {
    while (this.index < this.events.length) {
      // Longer delay for simulating responses creation
      if (this.index === 0) {
        await new Promise((r) => setTimeout(r, 800))
      }

      await new Promise((r) => setTimeout(r, 30))
      yield this.events[this.index++]
    }
  }
}

export function createMockStream<T extends { content: string }>(input: T): AsyncIterable<MockResponseStreamEvent> {
  const command: string = input.content
  let mockType: MockResponseStreamEvent[]

  switch (command) {
    case MockEventType.FAIL:
      mockType = getFailedStreamMock()
      break

    case MockEventType.API_FAIL:
      throw new Error('Mock API failure')

    case MockEventType.MIDWAY_FAIL:
      mockType = getMidwayFailStreamMock()
      break

    case MockEventType.INCOMPLETE_FAIL:
      mockType = getIncompleteStreamMock()
      break

    case MockEventType.RAG:
      mockType = getFileSearchStreamMock()
      break

    case MockEventType.CODE_BLOCK:
      mockType = getCodeBlockStreamMock()
      break

    case MockEventType.MATH_BLOCK:
      mockType = getMathBlockStreamMock()
      break

    default:
      mockType = getBasicStreamMock()
      break
  }

  return new MockStream<MockResponseStreamEvent>(mockType)
}
