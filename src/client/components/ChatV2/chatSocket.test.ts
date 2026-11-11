import { afterEach, describe, expect, test, vi } from 'vitest'

const postAbortableStream = vi.fn()
vi.mock('../../../config', () => ({ PUBLIC_URL: '' }))
vi.mock('../../util/apiClient', () => ({ postAbortableStream: (...args: unknown[]) => postAbortableStream(...args) }))

import type { ChatEvent } from '../../../shared/agentChat'
import type { ChatSocketClientMessage, ChatSocketServerMessage } from '../../../shared/chatSocket'
import { ChatSocketConnection, WebSocketChatTransport } from './chatSocket'

/** Stands in for the browser's WebSocket: the test opens, answers and closes it. */
class FakeSocket {
  readyState = 0
  sent: ChatSocketClientMessage[] = []
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null

  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
  close() {
    this.readyState = 3
    this.onclose?.()
  }
  open() {
    this.readyState = 1
    this.onopen?.()
  }
  receive(message: ChatSocketServerMessage) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }
}

const setup = () => {
  const sockets: FakeSocket[] = []
  let time = 0
  const connection = new ChatSocketConnection(
    () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket as unknown as WebSocket
    },
    () => time,
  )
  return { sockets, connection, advance: (ms: number) => (time += ms) }
}

const run = {
  input: {
    options: {
      chatMessages: [{ role: 'user' as const, content: 'hi' }],
      generationInfo: { model: 'mock' as const, promptInfo: { type: 'custom' as const, systemMessage: '' } },
    },
  },
  formData: new FormData(),
}

const text = (t: string): ChatEvent => ({ type: 'text.delta', path: [], text: t })

const collect = async (events: AsyncIterable<ChatEvent>) => {
  const all: ChatEvent[] = []
  for await (const event of events) all.push(event)
  return all
}

/** Waits for pending promise callbacks, so the transport has sent what it sends next. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => postAbortableStream.mockReset())

describe('WebSocketChatTransport', () => {
  test('sends run.start and streams the run events until run.end', async () => {
    const { sockets, connection } = setup()
    const transport = new WebSocketChatTransport(connection)
    const started = transport.start(run)
    sockets[0].open()
    await flush()

    expect(sockets[0].sent).toEqual([{ type: 'run.start', runId: '1', input: run.input }])
    sockets[0].receive({ type: 'run.event', runId: '1', event: text('a') })
    const result = await started
    sockets[0].receive({ type: 'run.event', runId: '1', event: text('b') })
    sockets[0].receive({ type: 'run.end', runId: '1', result: { status: 'completed' } })

    expect('events' in result && (await collect(result.events))).toEqual([text('a'), text('b')])
  })

  test('reuses the open socket for the next run, with a new run id', async () => {
    const { sockets, connection } = setup()
    const first = new WebSocketChatTransport(connection).start(run)
    sockets[0].open()
    await flush()
    sockets[0].receive({ type: 'run.end', runId: '1', result: { status: 'completed' } })
    await first

    void new WebSocketChatTransport(connection).start(run)
    await flush()

    expect(sockets).toHaveLength(1)
    expect(sockets[0].sent.map((m) => m.runId)).toEqual(['1', '2'])
  })

  test('returns warnings and pre-stream errors like the HTTP transport', async () => {
    const { sockets, connection } = setup()
    const warned = new WebSocketChatTransport(connection).start(run)
    sockets[0].open()
    await flush()
    const warnings = [{ warningType: 'usage', warning: 'Much', tokenCount: 1 }] as never
    sockets[0].receive({ type: 'run.end', runId: '1', result: { status: 'warnings', warnings } })
    expect(await warned).toEqual({ warnings })

    const refused = new WebSocketChatTransport(connection).start(run)
    await flush()
    sockets[0].receive({ type: 'run.end', runId: '2', result: { status: 'error', error: 'Usage limit reached', code: 403 } })
    expect(await refused).toEqual({ error: 'Usage limit reached' })
  })

  test('abort sends run.abort and makes the events throw with the abort reason on the signal', async () => {
    const { sockets, connection } = setup()
    const transport = new WebSocketChatTransport(connection)
    const started = transport.start(run)
    sockets[0].open()
    await flush()
    sockets[0].receive({ type: 'run.event', runId: '1', event: text('a') })
    const result = await started
    if (!('events' in result)) throw new Error('expected events')
    const iterator = result.events[Symbol.asyncIterator]()
    await iterator.next()

    transport.abort('user_aborted')

    await expect(iterator.next()).rejects.toThrow('aborted')
    expect(transport.signal.reason).toBe('user_aborted')
    expect(sockets[0].sent.at(-1)).toEqual({ type: 'run.abort', runId: '1' })
  })

  test('a timeout before the first event rejects start', async () => {
    const { sockets, connection } = setup()
    const transport = new WebSocketChatTransport(connection)
    const started = transport.start(run)
    sockets[0].open()
    await flush()

    transport.abort('timeout_error')

    await expect(started).rejects.toThrow('aborted')
    expect(sockets[0].sent.at(-1)).toEqual({ type: 'run.abort', runId: '1' })
  })

  test('a dropped socket breaks the stream, and the next run opens a new socket', async () => {
    const { sockets, connection } = setup()
    const started = new WebSocketChatTransport(connection).start(run)
    sockets[0].open()
    await flush()
    sockets[0].receive({ type: 'run.event', runId: '1', event: text('a') })
    const result = await started
    if (!('events' in result)) throw new Error('expected events')
    const all = collect(result.events)

    sockets[0].close()

    await expect(all).rejects.toThrow('Chat socket closed')
    void new WebSocketChatTransport(connection).start(run)
    expect(sockets).toHaveLength(2)
  })

  test('falls back to HTTP when the socket cannot open, and skips the socket for a while', async () => {
    postAbortableStream.mockResolvedValue({ warnings: [] })
    const { sockets, connection, advance } = setup()
    const started = new WebSocketChatTransport(connection).start(run)
    sockets[0].close()

    expect(await started).toEqual({ warnings: [] })
    expect(postAbortableStream).toHaveBeenCalledWith('ai/v4/stream', run.formData, expect.anything())

    await new WebSocketChatTransport(connection).start(run)
    expect(sockets).toHaveLength(1)
    expect(postAbortableStream).toHaveBeenCalledTimes(2)

    advance(60_000)
    void new WebSocketChatTransport(connection).start(run)
    expect(sockets).toHaveLength(2)
  })
})

describe('client-executed tools', () => {
  test('sends the attached folders, runs a requested tool and sends its result', async () => {
    const { sockets, connection } = setup()
    const execute = vi.fn(async () => ({ status: 'ok' as const, content: 'listing', artifact: { tool: 'ls' } }))
    const started = new WebSocketChatTransport(connection).start({ ...run, clientTools: { attachedFolders: ['Course notes'], execute } })
    sockets[0].open()
    await flush()

    expect(sockets[0].sent).toEqual([{ type: 'run.start', runId: '1', input: run.input, attachedFolders: ['Course notes'] }])
    sockets[0].receive({ type: 'run.event', runId: '1', event: text('a') })
    const result = await started
    sockets[0].receive({ type: 'tool.request', runId: '1', callId: 'call_1', name: 'ls', input: { path: 'Course notes' } })
    await flush()

    expect(execute).toHaveBeenCalledWith('ls', { path: 'Course notes' })
    expect(sockets[0].sent.at(-1)).toEqual({
      type: 'tool.result',
      runId: '1',
      callId: 'call_1',
      result: { status: 'ok', content: 'listing', artifact: { tool: 'ls' } },
    })

    // The request is not an event of the run
    sockets[0].receive({ type: 'run.end', runId: '1', result: { status: 'completed' } })
    expect('events' in result && (await collect(result.events))).toEqual([text('a')])
  })

  test('client tools without attached folders still tell the server that the browser runs them', async () => {
    const { sockets, connection } = setup()
    const execute = vi.fn(async () => ({ status: 'ok' as const, content: 'done' }))
    void new WebSocketChatTransport(connection).start({ ...run, clientTools: { attachedFolders: [], execute } })
    sockets[0].open()
    await flush()
    expect(sockets[0].sent).toEqual([{ type: 'run.start', runId: '1', input: run.input, attachedFolders: [] }])
  })

  test('without client tools, or when the tool throws, the result is an error', async () => {
    const { sockets, connection } = setup()
    const started = new WebSocketChatTransport(connection).start(run)
    sockets[0].open()
    await flush()
    expect(sockets[0].sent[0]).not.toHaveProperty('attachedFolders')
    sockets[0].receive({ type: 'tool.request', runId: '1', callId: 'call_1', name: 'ls', input: {} })
    await flush()
    expect(sockets[0].sent.at(-1)).toEqual({
      type: 'tool.result',
      runId: '1',
      callId: 'call_1',
      result: { status: 'error', error: 'This chat has no tools in the browser.' },
    })
    sockets[0].receive({ type: 'run.end', runId: '1', result: { status: 'completed' } })
    await started

    const execute = vi.fn(async () => {
      throw new Error('boom')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const second = new WebSocketChatTransport(connection).start({ ...run, clientTools: { attachedFolders: ['A'], execute } })
    await flush()
    sockets[0].receive({ type: 'tool.request', runId: '2', callId: 'call_2', name: 'ls', input: {} })
    await flush()
    expect(sockets[0].sent.at(-1)).toEqual({
      type: 'tool.result',
      runId: '2',
      callId: 'call_2',
      result: { status: 'error', error: 'The tool failed in the browser.' },
    })
    sockets[0].receive({ type: 'run.end', runId: '2', result: { status: 'completed' } })
    await second
  })
})
