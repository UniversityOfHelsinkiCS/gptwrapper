import {
  getBasicStreamMock,
  getCodeBlockStreamMock,
  getFailedStreamMock,
  getFileSearchFailStreamMock,
  getFileSearchStreamMock,
  getIncompleteStreamMock,
  getMathBlockStreamMock,
  getMidwayFailStreamMock,
  getTimeoutFailStreamMock,
  MockType,
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
    case MockType.FAIL:
      mockType = getFailedStreamMock()
      break

    case MockType.MIDWAY_FAIL:
      mockType = getMidwayFailStreamMock()
      break

    case MockType.TIMEOUT_FAIL:
      mockType = getTimeoutFailStreamMock()
      break

    case MockType.INCOMPLETE_FAIL:
      mockType = getIncompleteStreamMock()
      break

    case MockType.RAG:
      mockType = getFileSearchStreamMock()
      break

    case MockType.RAG_FAIL:
      mockType = getFileSearchFailStreamMock()
      break

    case MockType.CODE_BLOCK:
      mockType = getCodeBlockStreamMock()
      break

    case MockType.MATH_BLOCK:
      mockType = getMathBlockStreamMock()
      break

    default:
      mockType = getBasicStreamMock()
      break
  }

  return new MockStream<MockResponseStreamEvent>(mockType)
}
