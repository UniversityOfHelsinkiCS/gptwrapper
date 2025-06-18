import {
  getBasicStreamMock,
  getFailedStreamMock,
  getFileSearchFailStreamMock,
  getFileSearchStreamMock,
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
        await new Promise((r) => setTimeout(r, 1000))
      }

      await new Promise((r) => setTimeout(r, 60))
      yield this.events[this.index++]
    }
  }
}

export function createMockStream<T extends { content: string }>(input: T): AsyncIterable<MockResponseStreamEvent> {
  const command: string = input.content
  let mockType: MockResponseStreamEvent[]

  switch (command) {
    case MockType.RAG:
      mockType = getFileSearchStreamMock()
      break

    case MockType.RAG_FAIL:
      mockType = getFileSearchFailStreamMock()
      break

    case MockType.FAIL:
      mockType = getFailedStreamMock()
      break

    case MockType.MIDWAY_FAIL:
      mockType = getMidwayFailStreamMock()
      break

    case MockType.TIMEOUT_FAIL:
      mockType = getTimeoutFailStreamMock()
      break

    default:
      mockType = getBasicStreamMock()
      break
  }

  return new MockStream<MockResponseStreamEvent>(mockType)
}
