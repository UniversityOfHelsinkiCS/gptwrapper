import type { ResponseStreamEvent } from 'openai/resources/responses/responses'
import { mathTestContent, codeTestContent } from './mockContent'

export interface MockResponseStreamEvent {
  type: ResponseStreamEvent['type'] // inferred Responses Stream event types
  [key: string]: any
}

export enum MockEventType {
  RAG = 'rag',
  FAIL = 'fail',
  API_FAIL = 'api fail',
  MIDWAY_FAIL = 'midway fail',
  TIMEOUT_FAIL = 'timeout fail',
  INCOMPLETE_FAIL = 'incomplete fail',
  CODE_BLOCK = 'code block',
  MATH_BLOCK = 'math block',
}

const chunkText = (text: string): string[] => {
  const lines = text.split('\n')
  const chunkSize = 3
  const chunks: string[] = []

  for (const line of lines) {
    // Keep leading whitespace
    const words = line.match(/(\s+|\S+)/g) || []
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join('') // preserve exact spacing
      chunks.push(chunk)
    }
    chunks.push('\n') // Preserve line breaks
  }

  return chunks
}

export const getBasicStreamMock = (): MockResponseStreamEvent[] => {
  // Writing in template literals preserves the formatting of the response text
  const responseText = `### You are calling mock endpoint for streaming mock data.

- To mock a failed response, write: **fail**
- To mock a mid-sentence failed response, write: **midway fail**
- To mock a incomplete response, write: **incomplete fail**
- To mock a file search, write: **rag** -- _make sure to have a RAG index selected_
- To mock a code block, write: **code block**
- To mock a math block, write: **math block**
OVER
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
      message: 'Something went wrong',
    },
  ]
}

export const getIncompleteStreamMock = (): MockResponseStreamEvent[] => {
  // https://platform.openai.com/docs/api-reference/responses-streaming/response/incomplete
  const responseText = `Testing incomplete stream. Once upon a time, Alice went bought a new compuer. But inside the box was a strange`

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
  const responseText = `Testing midway failed stream. Once upon a time, Bob went to store but was hit by a`

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
          message: 'Server error',
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

export const getFileSearchStreamMock = (): MockResponseStreamEvent[] => {
  // https://platform.openai.com/docs/api-reference/responses-streaming/response/file_search_call
  const responseText = `This is a mock response for file search stream. It simulates a response that is augmented with file search results.`

  const chunkedResponseText = chunkText(responseText)

  return [
    {
      type: 'response.created',
    },
    {
      type: 'response.file_search_call.in_progress',
    },
    {
      type: 'response.output_item.done',
      item: {
        id: 'fs_mock',
        status: 'completed',
        type: 'file_search_call',
        queries: ['mock', 'mock query'],
        results: [
          {
            attributes: {},
            file_id: 'mock_file_search_id',
            filename: 'mock_filename',
            score: 0.333,
            text: 'Mocking RAG file annotations 1',
          },
          {
            attributes: {},
            file_id: 'mock_file_search_id',
            filename: 'mock_filename',
            score: 0.444,
            text: 'Mocking RAG file annotations 2',
          },
          {
            attributes: {},
            file_id: 'mock_file_search_id',
            filename: 'mock_filename',
            score: 0.555,
            text: 'Mocking RAG file annotations 3',
          },
        ],
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

export const getCodeBlockStreamMock = (): MockResponseStreamEvent[] => {
  const chunkedResponseText = chunkText(codeTestContent)

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
  const chunkedResponseText = chunkText(mathTestContent)

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
