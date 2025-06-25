import type { ResponseStreamEvent } from 'openai/resources/responses/responses'

export interface MockResponseStreamEvent {
  type: ResponseStreamEvent['type'] // inferred Responses Stream event types
  [key: string]: any
}

export enum MockEventType {
  RAG = 'rag',
  FAIL = 'fail',
  MIDWAY_FAIL = 'midway fail',
  TIMEOUT_FAIL = 'timeout fail',
  INCOMPLETE_FAIL = 'incomplete fail',
  RAG_FAIL = 'rag fail',
  CODE_BLOCK = 'code block',
  MATH_BLOCK = 'math block',
}

const chunkText = (text: string): string[] => {
  const lines = text.trim().split('\n')
  const chunkSize = 3
  const chunks: string[] = []

  for (const line of lines) {
    const words = line.trim().split(/\s+/)
    for (let i = 0; i < words.length; i += chunkSize) {
      // Join chunk words and append space, except after last chunk in the line
      const chunk = words.slice(i, i + chunkSize).join(' ') + ' '
      chunks.push(chunk)
    }
    // Add a newline chunk after each line to preserve line breaks
    chunks.push('\n')
  }

  return chunks
}

export const getBasicStreamMock = (): MockResponseStreamEvent[] => {
  // Writing in template literals preserves the formatting of the response text
  const responseText = `### You are calling mock endpoint for streaming mock data.

- To mock a failed response, write: **fail**
- To mock a mid-sentence failed response, write: **midway fail**
- To mock a timed-out response, write: **timeout fail**
- To mock a file search, write: **rag**
- To mock a file search fail response, write: **rag fail**
- To mock a code block, write: **code block**
- To mock a math block, write: **math block**
`

  const chunkedResponseText = chunkText(responseText)

  return [
    {
      type: 'response.created',
      response: {
        id: '',
      },
    },
    ...chunkedResponseText.map((chunk) => ({
      type: 'response.output_text.delta' as ResponseStreamEvent['type'],
      item_id: 'msg_mock',
      delta: chunk,
    })),
    {
      type: 'response.completed',
      response: {
        id: '',
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          output_tokens_details: {
            reasoning_tokens: 0,
          },
          total_tokens: 0,
        },
      },
    },
  ]
}

export const getFailedStreamMock = (): MockResponseStreamEvent[] => {
  // https://platform.openai.com/docs/api-reference/responses-streaming/error
  return [
    {
      type: 'error',
      message: 'Mock error for failed stream',
    },
  ]
}

export const getIncompleteStreamMock = (): MockResponseStreamEvent[] => {
  // https://platform.openai.com/docs/api-reference/responses-streaming/response/incomplete
  const responseText = `Testing incomplete stream`

  const chunkedResponseText = chunkText(responseText)
  return [
    {
      type: 'response.created',
    },
    ...chunkedResponseText.map((chunk) => ({
      type: 'response.output_text.delta' as ResponseStreamEvent['type'],
      item_id: 'msg_mock',
      delta: chunk,
    })),
    {
      type: 'response.incomplete',
      response: {
        id: '',
        incomplete_details: {
          reason: 'max_tokens',
        },
      },
    },
  ]
}

export const getMidwayFailStreamMock = (): MockResponseStreamEvent[] => {
  // https://platform.openai.com/docs/api-reference/responses-streaming/response/failed
  const responseText = `Testing midway failed stream. One upon a time, Bob went to store but was hit by a`

  const chunkedResponseText = chunkText(responseText)

  return [
    {
      type: 'response.created',
    },
    ...chunkedResponseText.map((chunk) => ({
      type: 'response.output_text.delta' as ResponseStreamEvent['type'],
      item_id: 'msg_mock',
      delta: chunk,
    })),
    {
      type: 'response.failed',
      response: {
        id: '',
        error: {
          code: 'server_error',
          message: 'Mock error for midway failed stream',
        },
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          output_tokens_details: {
            reasoning_tokens: 0,
          },
          total_tokens: 0,
        },
      },
    },
  ]
}

export const getTimeoutFailStreamMock = (): MockResponseStreamEvent[] => {
  // Simulate an unresponsive api
  return []
}

export const getFileSearchStreamMock = (): MockResponseStreamEvent[] => {
  // https://platform.openai.com/docs/api-reference/responses-streaming/response/file_search_call
  const responseText = `For testing RAG stream. Not yet implemented.`

  const chunkedResponseText = chunkText(responseText)

  return [
    {
      type: 'response.created',
    },
    ...chunkedResponseText.map((chunk) => ({
      type: 'response.output_text.delta' as ResponseStreamEvent['type'],
      item_id: 'msg_mock',
      delta: chunk,
    })),
    {
      type: 'response.completed',
      response: {
        id: '',
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          output_tokens_details: {
            reasoning_tokens: 0,
          },
          total_tokens: 0,
        },
      },
    },
  ]
}

export const getFileSearchFailStreamMock = (): MockResponseStreamEvent[] => {
  const responseText = `For testing failed RAG stream. Not implemented yet.`

  const chunkedResponseText = chunkText(responseText)

  return [
    {
      type: 'response.created',
    },
    ...chunkedResponseText.map((chunk) => ({
      type: 'response.output_text.delta' as ResponseStreamEvent['type'],
      item_id: 'msg_mock',
      delta: chunk,
    })),
    {
      type: 'response.completed',
      response: {
        id: '',
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          output_tokens_details: {
            reasoning_tokens: 0,
          },
          total_tokens: 0,
        },
      },
    },
  ]
}

export const getCodeBlockStreamMock = (): MockResponseStreamEvent[] => {
  const responseText = `For testing code block stream. Not yet implemented.`

  const chunkedResponseText = chunkText(responseText)

  return [
    {
      type: 'response.created',
    },
    ...chunkedResponseText.map((chunk) => ({
      type: 'response.output_text.delta' as ResponseStreamEvent['type'],
      item_id: 'msg_mock',
      delta: chunk,
    })),
    {
      type: 'response.completed',
      response: {
        id: '',
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          output_tokens_details: {
            reasoning_tokens: 0,
          },
          total_tokens: 0,
        },
      },
    },
  ]
}

export const getMathBlockStreamMock = (): MockResponseStreamEvent[] => {
  const responseText = `For testing math block stream. Not yet implemented.`

  const chunkedResponseText = chunkText(responseText)

  return [
    {
      type: 'response.created',
    },
    ...chunkedResponseText.map((chunk) => ({
      type: 'response.output_text.delta' as ResponseStreamEvent['type'],
      item_id: 'msg_mock',
      delta: chunk,
    })),
    {
      type: 'response.completed',
      response: {
        id: '',
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          output_tokens_details: {
            reasoning_tokens: 0,
          },
          total_tokens: 0,
        },
      },
    },
  ]
}
