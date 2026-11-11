import { PUBLIC_URL } from '../../../config'
import type { ChatEvent } from '../../../shared/agentChat'
import {
  CHAT_SOCKET_LOGGED_IN_AS_PARAM,
  CHAT_SOCKET_PATH,
  type ChatSocketClientMessage,
  type ChatSocketServerMessage,
  type ClientToolResult,
} from '../../../shared/chatSocket'
import safeLocalStorage from '../../util/safeLocalStorage'
import { HttpChatTransport, type ChatRun, type ChatStartResult, type ChatTransport, type ClientTools } from './chatTransport'
import { TypedAbortController, type StreamAbortReason } from './useChatStream'

const OPEN_TIMEOUT_MS = 5000
/** `WebSocket.OPEN` */
const OPEN = 1
/** After the socket failed to open, runs go straight over HTTP for this long instead of waiting for it again. */
const RETRY_AFTER_FAILURE_MS = 60_000

type RunMessage = Extract<ChatSocketServerMessage, { runId: string }>
type ToolRequestMessage = Extract<RunMessage, { type: 'tool.request' }>
/** What a run's events come from: everything for the run except tool requests, which are answered on the side. */
type RunStreamMessage = Exclude<RunMessage, ToolRequestMessage>

type RunListener = {
  onMessage: (message: RunMessage) => void
  onClose: () => void
}

type SocketLike = Pick<WebSocket, 'readyState' | 'send' | 'close' | 'onopen' | 'onclose' | 'onerror' | 'onmessage'>

/** One open WebSocket and the runs on it. */
export class ChatSocket {
  private runs = new Map<string, RunListener>()
  private runCount = 0

  constructor(
    private ws: SocketLike,
    readonly loggedInAs: string | null,
  ) {}

  get isOpen() {
    return this.ws.readyState === OPEN
  }

  nextRunId() {
    this.runCount++
    return String(this.runCount)
  }

  send(message: ChatSocketClientMessage) {
    if (this.isOpen) this.ws.send(JSON.stringify(message))
  }

  /** Routes the messages of `runId` to `listener` until the returned function is called. */
  register(runId: string, listener: RunListener) {
    this.runs.set(runId, listener)
    return () => {
      if (this.runs.get(runId) === listener) this.runs.delete(runId)
    }
  }

  close() {
    this.ws.close()
  }

  handleMessage(data: unknown) {
    let message: ChatSocketServerMessage
    try {
      message = JSON.parse(String(data)) as ChatSocketServerMessage
    } catch {
      console.error('Skipping malformed chat socket message:', data)
      return
    }
    if (message.type === 'error') {
      console.error('Chat socket error:', message.error)
      return
    }
    this.runs.get(message.runId)?.onMessage(message)
  }

  handleClose() {
    const listeners = [...this.runs.values()]
    this.runs.clear()
    for (const listener of listeners) listener.onClose()
  }
}

/** The tab's chat socket: opened lazily on the first run, and again on the next run after it closes. */
export class ChatSocketConnection {
  private socket: ChatSocket | null = null
  private opening: Promise<ChatSocket> | null = null
  private failedAt = -Infinity

  constructor(
    private createWebSocket: (loggedInAs: string | null) => SocketLike = (loggedInAs) => new WebSocket(chatSocketUrl(loggedInAs)),
    private now: () => number = () => Date.now(),
  ) {}

  /** False for a while after the socket failed to open. */
  get available() {
    return this.now() - this.failedAt >= RETRY_AFTER_FAILURE_MS
  }

  open(): Promise<ChatSocket> {
    const loggedInAs = safeLocalStorage.getItem('adminLoggedInAs')
    if (this.socket && this.socket.loggedInAs !== loggedInAs) {
      // An admin started or stopped hijacking: the socket's user is the old one.
      this.socket.close()
      this.socket = null
    }
    if (this.socket?.isOpen) return Promise.resolve(this.socket)

    this.opening ??= this.connect(loggedInAs).finally(() => {
      this.opening = null
    })
    return this.opening
  }

  private connect(loggedInAs: string | null) {
    return new Promise<ChatSocket>((resolve, reject) => {
      const ws = this.createWebSocket(loggedInAs)
      const socket = new ChatSocket(ws, loggedInAs)
      let opened = false

      const fail = (error: Error) => {
        clearTimeout(timeout)
        this.failedAt = this.now()
        reject(error)
      }
      const timeout = setTimeout(() => {
        fail(new Error('Chat socket did not open in time'))
        ws.onclose = null
        ws.close()
      }, OPEN_TIMEOUT_MS)

      ws.onopen = () => {
        clearTimeout(timeout)
        opened = true
        this.socket = socket
        resolve(socket)
      }
      ws.onmessage = (event) => socket.handleMessage(event.data)
      // An error is always followed by close.
      ws.onerror = () => {}
      ws.onclose = () => {
        if (!opened) {
          fail(new Error('Chat socket could not open'))
          return
        }
        if (this.socket === socket) this.socket = null
        socket.handleClose()
      }
    })
  }
}

const chatSocketUrl = (loggedInAs: string | null) => {
  const url = new URL(`${PUBLIC_URL}${CHAT_SOCKET_PATH}`, window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  if (loggedInAs) url.searchParams.set(CHAT_SOCKET_LOGGED_IN_AS_PARAM, loggedInAs)
  return url.toString()
}

const tabConnection = new ChatSocketConnection()

/**
 * One chat run over the tab's WebSocket. Create one per run, like `HttpChatTransport`, which it falls back to
 * when the socket cannot open. Behaves like the HTTP transport towards the rest of the client: warnings and
 * pre-stream errors are returned from `start`, an abort or a dropped socket makes the events throw.
 */
export class WebSocketChatTransport implements ChatTransport {
  private controller = new TypedAbortController<StreamAbortReason>()
  readonly signal = this.controller.signal

  constructor(private connection: ChatSocketConnection = tabConnection) {}

  async start(run: ChatRun): Promise<ChatStartResult> {
    if (!this.connection.available) return this.startOverHttp(run)

    let socket: ChatSocket
    try {
      socket = await untilAborted(this.connection.open(), this.signal)
    } catch (error) {
      if (this.signal.aborted) throw error
      console.warn('Chat socket could not open, chatting over HTTP:', error)
      return this.startOverHttp(run)
    }

    return startSocketRun(socket, run, this.signal)
  }

  abort(reason: StreamAbortReason) {
    this.controller.abort(reason)
  }

  private startOverHttp(run: ChatRun) {
    return new HttpChatTransport(this.controller).start(run)
  }
}

const abortError = () => new DOMException('The chat run was aborted', 'AbortError')

const untilAborted = <T>(promise: Promise<T>, signal: AbortSignal) =>
  new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError())
      return
    }
    const onAbort = () => reject(abortError())
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })

/** Runs a tool the server asked for and sends its result back. Without client tools, or if it throws, the result is an error. */
const answerToolRequest = async (socket: ChatSocket, { runId, callId, name, input }: ToolRequestMessage, clientTools: ClientTools | undefined) => {
  let result: ClientToolResult
  try {
    result = clientTools ? await clientTools.execute(name, input) : { status: 'error', error: 'This chat has no tools in the browser.' }
  } catch (error) {
    console.error('Client tool failed:', error)
    result = { status: 'error', error: 'The tool failed in the browser.' }
  }
  // After an abort or a closed socket nobody waits for the result; the server ignores it anyway.
  socket.send({ type: 'tool.result', runId, callId, result })
}

const startSocketRun = async (socket: ChatSocket, { input, formData, clientTools }: ChatRun, signal: AbortSignal): Promise<ChatStartResult> => {
  const runId = socket.nextRunId()
  const messages = createChannel<RunStreamMessage>()

  const unregister = socket.register(runId, {
    onMessage: (message) => {
      if (message.type === 'tool.request') {
        if (!signal.aborted) void answerToolRequest(socket, message, clientTools)
        return
      }
      messages.push(message)
    },
    onClose: () => messages.fail(new Error('Chat socket closed')),
  })
  const onAbort = () => {
    socket.send({ type: 'run.abort', runId })
    messages.fail(abortError())
  }
  signal.addEventListener('abort', onAbort, { once: true })
  const cleanup = () => {
    signal.removeEventListener('abort', onAbort)
    unregister()
  }

  const file = formData.get('file')
  socket.send({
    type: 'run.start',
    runId,
    input,
    fileSize: file instanceof Blob ? file.size : undefined,
    // Also an empty list: it tells the server that this browser runs the My files tools.
    ...(clientTools ? { attachedFolders: clientTools.attachedFolders } : {}),
  })

  let first: RunStreamMessage | undefined
  try {
    first = await messages.next()
  } catch (error) {
    cleanup()
    throw error
  }

  if (first?.type === 'run.event') {
    return { events: runEvents(first.event, messages, cleanup) }
  }

  cleanup()
  const result = first?.result ?? { status: 'completed' }
  switch (result.status) {
    case 'warnings':
      return { warnings: result.warnings }
    case 'error':
      return { error: result.error }
    default:
      return { events: runEvents(null, messages, () => {}) }
  }
}

async function* runEvents(first: ChatEvent | null, messages: Channel<RunStreamMessage>, cleanup: () => void): AsyncGenerator<ChatEvent> {
  try {
    if (!first) return
    yield first
    while (true) {
      const message = await messages.next()
      if (!message) return
      if (message.type === 'run.event') {
        yield message.event
        continue
      }
      // An error after the stream started is a broken stream, as when an HTTP response is cut off.
      if (message.result.status === 'error') throw new Error(message.result.error)
      return
    }
  } finally {
    cleanup()
  }
}

type Channel<T> = {
  push: (item: T) => void
  /** Items pushed before still come out first, then `next` throws `error`. */
  fail: (error: Error) => void
  /** The next item, waiting for it if needed. */
  next: () => Promise<T | undefined>
}

const createChannel = <T>(): Channel<T> => {
  const items: T[] = []
  let failure: Error | null = null
  let waiting: { resolve: (item: T) => void; reject: (error: Error) => void } | null = null

  return {
    push: (item) => {
      if (failure) return
      if (waiting) {
        waiting.resolve(item)
        waiting = null
      } else {
        items.push(item)
      }
    },
    fail: (error) => {
      if (failure) return
      failure = error
      waiting?.reject(error)
      waiting = null
    },
    next: () => {
      if (items.length > 0) return Promise.resolve(items.shift())
      if (failure) return Promise.reject(failure)
      return new Promise<T>((resolve, reject) => {
        waiting = { resolve, reject }
      })
    },
  }
}
