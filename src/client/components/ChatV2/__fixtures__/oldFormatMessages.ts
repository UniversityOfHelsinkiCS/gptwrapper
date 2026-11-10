/**
 * Chat messages as they were saved in localStorage before assistant messages had `parts`
 * (assistant `content: string` + `toolCalls`, no `messagesVersion`).
 */
export const oldFormatMessages = [
  { role: 'user', content: 'Explain **Pythagoras** & <script>alert(1)</script>' },
  {
    role: 'assistant',
    content:
      '# Pythagoras\n\nThe theorem says $$a^2 + b^2 = c^2$$ where \\alpha is *not* used.\n\n```python\nprint("hi")\n```\n\nSee [Wikipedia](https://en.wikipedia.org) and `code`.',
    toolCalls: {},
    generationInfo: { model: 'gpt-5-mini', temperature: 0.5, promptInfo: { type: 'custom', systemMessage: '' } },
  },
  {
    role: 'user',
    content: [
      { type: 'text', text: 'What is in this picture?' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
    ],
    attachments: 'cat.png',
  },
  {
    role: 'assistant',
    content: 'A ***cat***.\nIt is **sleeping**.',
    generationInfo: { model: 'gpt-5-mini', promptInfo: { type: 'saved', id: 'p1', name: 'Biology helper', systemMessage: 'be nice' } },
  },
  { role: 'user', content: 'And now?', fileContent: 'file text', attachments: 'notes.txt' },
  {
    role: 'assistant',
    content: '',
    error: 'timeout_error',
    toolCalls: {},
    generationInfo: { model: 'gpt-5-mini', promptInfo: { type: 'custom', systemMessage: 'x' } },
  },
  { role: 'user', content: 'Where is this in the material?' },
  {
    role: 'assistant',
    content: 'Found it in the lecture notes.',
    toolCalls: {
      call_1: {
        type: 'toolCallStatus',
        callId: 'call_1',
        toolName: 'document_search',
        text: 'Searching',
        input: { query: 'pythagoras' },
        result: { files: [{ fileName: 'lecture1.pdf', score: 0.9 }, { fileName: 'lecture2.pdf' }] },
      },
      call_2: {
        type: 'toolCallStatus',
        callId: 'call_2',
        toolName: 'document_search',
        text: 'Searching',
        input: { query: 'triangle' },
        result: { files: [] },
      },
    },
    generationInfo: { model: 'gpt-5-mini', promptInfo: { type: 'custom', systemMessage: '' } },
  },
] as const

/** The old assistant message that used the RAG file search tool. */
export const oldFormatMessageWithToolCalls = oldFormatMessages[7]
