import { type ResponseInput } from 'openai/resources/responses/responses'
import { getBasicStreamMock, type MockResponseStreamEvent } from './mockFunctions'

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
      await new Promise((r) => setTimeout(r, 100))
      yield this.events[this.index++]
    }
  }
}

export function createMockStream({ input }: { input: ResponseInput }): AsyncIterable<MockResponseStreamEvent> {
  let mockType: MockResponseStreamEvent[]

  switch (input) {
    // case :
    //     mockType = getFailStream()
    //     break

    default:
      mockType = getBasicStreamMock()
      break
  }

  return new MockStream<MockResponseStreamEvent>(mockType)
}
