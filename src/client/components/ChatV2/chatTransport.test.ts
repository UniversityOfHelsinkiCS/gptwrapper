import { afterEach, describe, expect, test, vi } from 'vitest'

const postAbortableStream = vi.fn()
vi.mock('../../util/apiClient', () => ({ postAbortableStream: (...args: unknown[]) => postAbortableStream(...args) }))

import type { ChatEvent } from '../../../shared/agentChat'
import { HttpChatTransport, readNdjsonEvents } from './chatTransport'

const streamOf = (chunks: string[]) => {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

const collect = async (events: AsyncIterable<ChatEvent>) => {
  const all: ChatEvent[] = []
  for await (const event of events) all.push(event)
  return all
}

const run = {
  input: {
    options: {
      chatMessages: [{ role: 'user' as const, content: 'hi' }],
      generationInfo: { model: 'mock' as const, promptInfo: { type: 'custom' as const, systemMessage: '' } },
    },
  },
}

afterEach(() => postAbortableStream.mockReset())

describe('readNdjsonEvents', () => {
  test('parses one event per line', async () => {
    const events = await collect(readNdjsonEvents(streamOf(['{"type":"text.delta","path":[],"text":"a"}\n{"type":"processing"}\n'])))
    expect(events).toEqual([{ type: 'text.delta', path: [], text: 'a' }, { type: 'processing' }])
  })

  test('joins a line split across chunks', async () => {
    const events = await collect(
      readNdjsonEvents(streamOf(['{"type":"text.de', 'lta","path":[],"text":"a"}\n{"type":"usage","inputTokens":1,', '"outputTokens":2}'])),
    )
    expect(events).toEqual([
      { type: 'text.delta', path: [], text: 'a' },
      { type: 'usage', inputTokens: 1, outputTokens: 2 },
    ])
  })

  test('skips blank and malformed lines', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const events = await collect(readNdjsonEvents(streamOf(['\n  \nnot json\n{"type":"error","error":"x"}\n'])))
    expect(events).toEqual([{ type: 'error', error: 'x' }])
  })

  test('a read error is thrown to the consumer', async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error('network error'))
      },
    })
    await expect(collect(readNdjsonEvents(stream))).rejects.toThrow('network error')
  })
})

describe('HttpChatTransport', () => {
  test('posts the run to the v4 endpoint and returns the events', async () => {
    postAbortableStream.mockResolvedValue({ stream: streamOf(['{"type":"text.delta","path":[],"text":"hi"}\n']) })
    const transport = new HttpChatTransport()
    const formData = new FormData()

    const res = await transport.start({ ...run, formData })

    expect(postAbortableStream).toHaveBeenCalledWith('ai/v4/stream', formData, expect.anything())
    expect(JSON.parse(formData.get('data') as string)).toEqual(run.input)
    expect('events' in res && (await collect(res.events))).toEqual([{ type: 'text.delta', path: [], text: 'hi' }])
  })

  test('passes warnings and errors through', async () => {
    postAbortableStream.mockResolvedValue({ warnings: [{ warningType: 'usage', warning: 'w', canIgnore: true, tokenUsagePercentage: 90 }] })
    expect(await new HttpChatTransport().start({ ...run, formData: new FormData() })).toEqual(expect.objectContaining({ warnings: expect.any(Array) }))

    postAbortableStream.mockResolvedValue({ error: 'Model maximum context reached' })
    expect(await new HttpChatTransport().start({ ...run, formData: new FormData() })).toEqual(
      expect.objectContaining({ error: 'Model maximum context reached' }),
    )
  })

  test('abort aborts the request with the reason', async () => {
    const transport = new HttpChatTransport()
    postAbortableStream.mockResolvedValue({ stream: streamOf([]) })
    await transport.start({ ...run, formData: new FormData() })

    transport.abort('user_aborted')

    const passedController = postAbortableStream.mock.calls[0][2]
    expect(passedController.signal.aborted).toBe(true)
    expect(transport.signal.reason).toBe('user_aborted')
  })
})
