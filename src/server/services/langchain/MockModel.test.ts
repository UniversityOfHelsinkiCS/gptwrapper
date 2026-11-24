// @vitest-environment node
import { HumanMessage } from '@langchain/core/messages'
import { describe, expect, it } from 'vitest'
import { withQuotes } from '../agent/quotes'
import { MockModel } from './MockModel'

const quote = { kind: 'text', path: 'Course/notes.md', text: 'rag in the quote' } as const

describe('MockModel triggers', () => {
  it('match the text after the open file and the quotes', async () => {
    const model = new MockModel({})
    const content = withQuotes('say hello', [quote], { path: 'Course/notes.md', heading: 'Intro' })
    const reply = await model.invoke([new HumanMessage(content)])
    expect(reply.content).toBe('hello')
  })

  it('match the text of a message with content blocks', async () => {
    const model = new MockModel({})
    const content = [
      { type: 'text', text: withQuotes('', undefined, { path: 'Course/lecture.pdf', page: 2 }) },
      { type: 'text', text: 'rag please' },
    ]
    const reply = await model.invoke([new HumanMessage({ content })])
    expect(reply.tool_calls?.[0]?.name).toBe('document_search')
  })
})
