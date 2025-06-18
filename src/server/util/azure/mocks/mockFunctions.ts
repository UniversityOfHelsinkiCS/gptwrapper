import type { ResponseStreamEvent } from 'openai/resources/responses/responses'

export interface MockResponseStreamEvent {
  type: ResponseStreamEvent['type'] // inferred Responses Stream event types
  [key: string]: any
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
  const responseText = `### You are calling mock endpoint for streaming mock data.

- To mock a failing response, write: **fail**.
- To mock a timed-out response, write: **timeout fail**
- To mock a file search fail response, write: **rag fail**
`

  const chunkedResponseText = chunkText(responseText)

  return [
    {
      type: 'response.created',
      response: {
        id: 'resp_mock',
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
        id: 'resp_mock',
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
