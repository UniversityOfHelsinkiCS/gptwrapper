// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocket } from 'ws'

// Dev and CI replace the Shibboleth headers with a dev user; the socket is tested as in production.
vi.mock('../../../config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../config')>()),
  inDevelopment: false,
  inCI: false,
}))

vi.mock('../../db/models', () => ({
  ChatInstance: { findOne: vi.fn(), findByPk: vi.fn() },
  Discussion: { create: vi.fn() },
  Enrolment: { findOne: vi.fn() },
  Prompt: { findByPk: vi.fn() },
  PromptUsage: { create: vi.fn() },
  RagIndex: {},
  Responsibility: { findOne: vi.fn() },
  User: { findByPk: vi.fn() },
  UserChatInstanceUsage: { findOrCreate: vi.fn() },
}))

vi.mock('../../services/chatInstances/usage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/chatInstances/usage')>()),
  checkCourseUsage: vi.fn(() => true),
  getCourseTokenLimit: vi.fn(() => 50_000),
  getUsage: vi.fn(async () => 0),
  getUserTokenLimit: vi.fn(async () => 100_000),
  incrementCourseUsage: vi.fn(),
  incrementUsage: vi.fn(),
}))

vi.mock('../../services/rag/search', () => ({ search: vi.fn() }))
vi.mock('../../services/langchain/fileSearchResultsStore', () => ({ ToolResultStore: { saveResults: vi.fn() } }))
vi.mock('../../util/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))
vi.mock('@sentry/node', () => ({ captureException: vi.fn() }))

vi.mock('../../services/agent/runAgent', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/agent/runAgent')>()
  return { ...original, runAgent: vi.fn(original.runAgent) }
})

import type { ChatEvent } from '../../../shared/agentChat'
import { CHAT_SOCKET_PATH, type ChatSocketClientMessage, type ChatSocketServerMessage } from '../../../shared/chatSocket'
import { getUsage, getUserTokenLimit, incrementUsage } from '../../services/chatInstances/usage'
import { runAgent, type RunAgentParams } from '../../services/agent/runAgent'
import { MockModel } from '../../services/langchain/MockModel'
import { attachChatSocket } from './v4Socket'

const shibbolethHeaders = {
  uid: 'student1',
  mail: 'student1@example.com',
  preferredlanguage: 'en',
  hypersonsisuid: 'hlo-1',
  hygroupcn: 'grp-students',
}

const listen = async (heartbeatIntervalMs?: number) => {
  const server = createServer((_req, res) => res.writeHead(404).end())
  attachChatSocket(server, { heartbeatIntervalMs })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { server, url: `ws://127.0.0.1:${(server.address() as AddressInfo).port}${CHAT_SOCKET_PATH}` }
}

const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()))

let server: Server
let url: string

beforeAll(async () => {
  ;({ server, url } = await listen())
})

afterAll(() => close(server))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUsage).mockResolvedValue(0)
  vi.mocked(getUserTokenLimit).mockResolvedValue(100_000)
})

/** A connected client that collects every server message. */
const connect = async (headers: Record<string, string> = shibbolethHeaders, options: { autoPong?: boolean; socketUrl?: string } = {}) => {
  const ws = new WebSocket(options.socketUrl ?? url, { headers, autoPong: options.autoPong ?? true })
  const received: ChatSocketServerMessage[] = []
  const waiters: (() => void)[] = []
  ws.on('message', (data) => {
    received.push(JSON.parse(data.toString()))
    for (const wake of waiters.splice(0)) wake()
  })
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve())
    ws.once('error', reject)
  })

  const send = (message: ChatSocketClientMessage | Record<string, unknown>) => ws.send(JSON.stringify(message))

  /** Waits until a message matches. */
  const waitFor = async (match: (message: ChatSocketServerMessage) => boolean) => {
    while (!received.some(match)) {
      await new Promise<void>((resolve) => waiters.push(resolve))
    }
    return received.find(match)!
  }

  const runEnd = (runId: string) => waitFor((m) => m.type === 'run.end' && m.runId === runId) as Promise<Extract<ChatSocketServerMessage, { type: 'run.end' }>>

  const eventsOf = (runId: string): ChatEvent[] => received.flatMap((m) => (m.type === 'run.event' && m.runId === runId ? [m.event] : []))

  return { ws, received, send, waitFor, runEnd, eventsOf }
}

/** The upgrade's HTTP status when the server refuses it. */
const refusedStatus = (headers: Record<string, string>, socketUrl = url) =>
  new Promise<number>((resolve, reject) => {
    const ws = new WebSocket(socketUrl, { headers })
    ws.on('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0))
    ws.on('open', () => reject(new Error('The upgrade was accepted')))
    ws.on('error', () => {})
  })

const runStart = (runId: string, message = 'say hello world'): ChatSocketClientMessage => ({
  type: 'run.start',
  runId,
  input: {
    options: {
      chatMessages: [{ role: 'user', content: message }],
      generationInfo: { model: 'mock', promptInfo: { type: 'custom', systemMessage: 'You are helpful' } },
    },
  },
})

const textOf = (events: ChatEvent[]) =>
  events
    .filter((e) => e.type === 'text.delta')
    .map((e) => e.text)
    .join('')

/** Makes the next run wait until it is aborted, and resolves with its abort reason. */
const holdNextRun = () => {
  let started: (params: RunAgentParams) => void = () => {}
  const params = new Promise<RunAgentParams>((resolve) => {
    started = resolve
  })
  vi.mocked(runAgent).mockImplementationOnce(async (runParams) => {
    started(runParams)
    await new Promise((resolve) => runParams.signal.addEventListener('abort', resolve))
    return { status: 'aborted' }
  })
  return params
}

describe('chat socket upgrade', () => {
  test('is refused without the Shibboleth headers', async () => {
    expect(await refusedStatus({})).toBe(401)
  })

  test('is refused from another origin', async () => {
    expect(await refusedStatus({ ...shibbolethHeaders, origin: 'https://evil.example.com', host: 'chat.example.com' })).toBe(403)
  })

  test('is accepted from the same origin', async () => {
    const { ws } = await connect({ ...shibbolethHeaders, origin: 'https://chat.example.com', host: 'chat.example.com' })
    ws.close()
  })

  test('is refused on another path', async () => {
    expect(await refusedStatus(shibbolethHeaders, url.replace(CHAT_SOCKET_PATH, '/api/other'))).toBe(404)
  })
})

describe('chat socket runs', () => {
  test('run.start streams the events of the run and ends with run.end', async () => {
    const client = await connect()
    client.send(runStart('1'))

    const end = await client.runEnd('1')
    const events = client.eventsOf('1')

    expect(end.result).toEqual({ status: 'completed' })
    expect(textOf(events)).toBe('hello world')
    expect(events.at(-1)).toEqual({ type: 'usage', inputTokens: 0, outputTokens: 0 })
    expect(client.received.at(-1)).toBe(end)
    expect(vi.mocked(runAgent).mock.calls[0][0].user).toMatchObject({ id: 'hlo-1', username: 'student1' })
    expect(incrementUsage).toHaveBeenCalledOnce()
    client.ws.close()
  })

  test('runs one after another on the same socket', async () => {
    const client = await connect()
    client.send(runStart('1', 'say first'))
    await client.runEnd('1')
    client.send(runStart('2', 'say second'))
    await client.runEnd('2')

    expect(textOf(client.eventsOf('1'))).toBe('first')
    expect(textOf(client.eventsOf('2'))).toBe('second')
    client.ws.close()
  })

  test('a second run.start while a run is going is refused, and the first run goes on', async () => {
    const client = await connect()
    client.send(runStart('1'))
    client.send(runStart('2'))

    expect((await client.runEnd('2')).result).toEqual({ status: 'error', error: 'A run is already in progress', code: 409 })
    expect((await client.runEnd('1')).result).toEqual({ status: 'completed' })
    expect(textOf(client.eventsOf('1'))).toBe('hello world')
    expect(client.eventsOf('2')).toEqual([])
    client.ws.close()
  })

  test('run.abort aborts the run, and the next run can start at once', async () => {
    const held = holdNextRun()
    const client = await connect()
    client.send(runStart('1'))
    const { signal } = await held

    client.send({ type: 'run.abort', runId: '1' })
    client.send(runStart('2'))

    expect((await client.runEnd('1')).result).toEqual({ status: 'aborted' })
    expect(signal.reason).toBe('client_aborted')
    expect((await client.runEnd('2')).result).toEqual({ status: 'completed' })
    client.ws.close()
  })

  test('a dropped connection aborts the run', async () => {
    const held = holdNextRun()
    const client = await connect()
    client.send(runStart('1'))
    const { signal } = await held

    client.ws.terminate()

    await vi.waitFor(() => expect(signal.reason).toBe('client_disconnected'))
  })

  test('a client that stops answering pings is dropped and its run aborted', async () => {
    const quick = await listen(30)
    const held = holdNextRun()
    const client = await connect(shibbolethHeaders, { autoPong: false, socketUrl: quick.url })
    const closed = new Promise<void>((resolve) => client.ws.once('close', () => resolve()))
    client.send(runStart('1'))
    const { signal } = await held

    await closed
    await vi.waitFor(() => expect(signal.reason).toBe('client_disconnected'))
    await close(quick.server)
  })

  test('warnings end the run before streaming, as the 201 response on HTTP', async () => {
    vi.mocked(getUserTokenLimit).mockResolvedValue(50)
    const client = await connect()
    client.send(runStart('1'))

    expect((await client.runEnd('1')).result).toEqual({ status: 'warnings', warnings: [expect.objectContaining({ warningType: 'usage' })] })
    expect(client.eventsOf('1')).toEqual([])
    client.ws.close()
  })

  test('a refused run ends with the HTTP status the HTTP route would answer', async () => {
    vi.mocked(getUsage).mockResolvedValue(100_000)
    const client = await connect()
    client.send(runStart('1'))

    expect((await client.runEnd('1')).result).toEqual({ status: 'error', error: 'Usage limit reached', code: 403 })
    client.ws.close()
  })

  test('a failing model emits an error event and ends the run', async () => {
    const client = await connect()
    client.send(runStart('1', 'fail'))

    expect((await client.runEnd('1')).result).toEqual({ status: 'completed' })
    expect(client.eventsOf('1')).toContainEqual({ type: 'error', error: 'Error while generating response' })
    client.ws.close()
  })

  test('shows the content-filter explanation as the answer', async () => {
    const filtered = Object.assign(new Error('filtered'), { code: 'content_filter', error: { message: 'Blocked by the content filter.' } })
    const spy = vi.spyOn(MockModel.prototype, '_streamResponseChunks').mockImplementation(async function* () {
      yield* []
      throw filtered
    })
    const client = await connect()
    client.send(runStart('1', 'say something bad'))

    expect((await client.runEnd('1')).result).toEqual({ status: 'completed' })
    spy.mockRestore()
    expect(client.eventsOf('1')).toContainEqual({ type: 'text.delta', path: [], text: 'Blocked by the content filter.' })
    client.ws.close()
  })

  test('an invalid run.start ends that run, other invalid messages get an error', async () => {
    const client = await connect()
    client.send({ type: 'run.start', runId: '1', input: { options: {} } })
    client.ws.send('not json')

    expect((await client.runEnd('1')).result).toEqual({ status: 'error', error: 'Invalid request', code: 400 })
    expect(await client.waitFor((m) => m.type === 'error')).toEqual({ type: 'error', error: 'Invalid message' })
    expect(runAgent).not.toHaveBeenCalled()
    client.ws.close()
  })
})
