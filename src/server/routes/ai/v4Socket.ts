import type { IncomingMessage, Server } from 'node:http'
import { STATUS_CODES } from 'node:http'
import type { Duplex } from 'node:stream'
import * as Sentry from '@sentry/node'
import { WebSocketServer, WebSocket, type RawData } from 'ws'
import { z } from 'zod/v4'
import { inCI, inDevelopment, inProduction, inStaging } from '../../../config'
import { PostStreamSchemaV4, type ChatEvent } from '../../../shared/agentChat'
import { CHAT_SOCKET_LOGGED_IN_AS_PARAM, CHAT_SOCKET_PATH, type ChatSocketServerMessage, type RunEndResult } from '../../../shared/chatSocket'
import type { User } from '../../../shared/user'
import shibbolethMiddleware from '../../middleware/shibboleth'
import userMiddleware from '../../middleware/user'
import { createClientToolBridge, type ClientToolBridge } from '../../services/agent/clientTools'
import { runAgent } from '../../services/agent/runAgent'
import { parseAttachedFolders } from '../../services/agent/tools/fileTools'
import { ApplicationError } from '../../util/ApplicationError'
import logger from '../../util/logger'

/** Browsers answer pings by themselves. A socket that has not answered the previous ping is dropped. */
export const HEARTBEAT_INTERVAL_MS = 25_000
/** The same as the JSON body limit of the HTTP API. */
const MAX_MESSAGE_BYTES = 10 * 1024 * 1024

const ClientToolResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), content: z.string(), artifact: z.unknown().optional() }),
  z.object({ status: z.literal('error'), error: z.string() }),
])

const ChatSocketClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('run.start'),
    runId: z.string().min(1),
    input: PostStreamSchemaV4,
    fileSize: z.number().optional(),
    attachedFolders: z.array(z.string()).max(100).optional(),
  }),
  z.object({ type: z.literal('run.abort'), runId: z.string().min(1) }),
  z.object({ type: z.literal('tool.result'), runId: z.string().min(1), callId: z.string().min(1), result: ClientToolResultSchema }),
])

type SocketUser = { user: User; hijackedBy?: User }

type ActiveRun = { runId: string; controller: AbortController; clientTools: ClientToolBridge }

type ChatSocketOptions = { path?: string; heartbeatIntervalMs?: number; clientToolTimeoutMs?: number }

/**
 * Serves chat runs over WebSocket on `CHAT_SOCKET_PATH` (protocol in `shared/chatSocket.ts`), next to the HTTP
 * NDJSON route in `v4.ts`. Both run the same `runAgent`. The user comes from the Shibboleth headers of the
 * upgrade request, through the same middleware as HTTP requests.
 */
export const attachChatSocket = (
  server: Server,
  { path = CHAT_SOCKET_PATH, heartbeatIntervalMs = HEARTBEAT_INTERVAL_MS, clientToolTimeoutMs }: ChatSocketOptions = {},
) => {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES })
  const alive = new WeakMap<WebSocket, boolean>()

  server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname !== path) {
      refuseUpgrade(socket, 404)
      return
    }

    authenticateUpgrade(req, url)
      .then((result) => {
        if ('refused' in result) {
          logger.info('Chat socket upgrade refused', { status: result.refused, reason: result.reason })
          refuseUpgrade(socket, result.refused)
          return
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          alive.set(ws, true)
          ws.on('pong', () => alive.set(ws, true))
          handleConnection(ws, result, { clientToolTimeoutMs })
        })
      })
      .catch((error) => {
        logger.error('Chat socket upgrade failed', { error: error instanceof Error ? { message: error.message, stack: error.stack } : error })
        refuseUpgrade(socket, 500)
      })
  })

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.get(ws)) {
        // Closes the socket, which aborts its run.
        ws.terminate()
        continue
      }
      alive.set(ws, false)
      ws.ping()
    }
  }, heartbeatIntervalMs)

  server.on('close', () => {
    clearInterval(heartbeat)
    for (const ws of wss.clients) ws.terminate()
    wss.close()
  })

  return wss
}

const refuseUpgrade = (socket: Duplex, status: number) => {
  socket.end(`HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`)
  socket.destroy()
}

type UpgradeResult = SocketUser | { refused: 401 | 403; reason: string }

/** Runs the upgrade request through the Shibboleth and user middleware, as the HTTP API does for every request. */
const authenticateUpgrade = async (req: IncomingMessage, url: URL): Promise<UpgradeResult> => {
  if (!isSameOrigin(req)) {
    // WebSockets are not covered by CORS: without this, any site could chat as the user with their Shibboleth session.
    return { refused: 403, reason: 'origin' }
  }

  if (inDevelopment || inCI) {
    copyTestUserCookies(req)
  }

  const loggedInAs = url.searchParams.get(CHAT_SOCKET_LOGGED_IN_AS_PARAM)
  if (loggedInAs) {
    req.headers['x-admin-logged-in-as'] = loggedInAs
  }

  const request = req as IncomingMessage & { user?: User; hijackedBy?: User }
  const runMiddleware = (middleware: (req: any, res: any, next: (error?: unknown) => void) => unknown) =>
    new Promise<void>((resolve, reject) => {
      Promise.resolve(middleware(request, {}, (error?: unknown) => (error ? reject(error) : resolve()))).catch(reject)
    })

  await runMiddleware(shibbolethMiddleware)
  try {
    await runMiddleware(userMiddleware)
  } catch {
    // The hijacked user does not exist.
    return { refused: 403, reason: 'user' }
  }

  const loggedInUser = request.hijackedBy ?? request.user
  if (!request.user || !loggedInUser?.username) {
    return { refused: 401, reason: 'shibboleth' }
  }

  return { user: request.user, hijackedBy: request.hijackedBy }
}

const TEST_USER_HEADERS = ['x-test-user-index', 'x-test-user-role']

/**
 * The e2e tests pick their user with `x-test-user-*` headers, which browsers do not send on a WebSocket upgrade,
 * so the e2e fixtures set them as cookies too. Only used in dev and CI, like the headers themselves.
 */
const copyTestUserCookies = (req: IncomingMessage) => {
  const cookies = new Map(
    (req.headers.cookie ?? '').split(';').map((cookie) => {
      const [name, ...value] = cookie.trim().split('=')
      return [name, decodeURIComponent(value.join('='))] as const
    }),
  )
  for (const name of TEST_USER_HEADERS) {
    const value = cookies.get(name)
    if (!req.headers[name] && value) req.headers[name] = value
  }
}

/** A browser always sends `Origin`; it must be this site. The dev server's proxy changes `Host`, so dev and CI skip the check. */
const isSameOrigin = (req: IncomingMessage) => {
  const { origin } = req.headers
  if (!origin || inDevelopment || inCI) return true

  const forwardedHost = req.headers['x-forwarded-host']
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)?.split(',')[0].trim() ?? req.headers.host
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** The client-executed file tools are experimental: only for admins, also while they chat as another user. */
const canUseClientTools = ({ user, hijackedBy }: SocketUser) => Boolean((hijackedBy ?? user).isAdmin)

const handleConnection = (ws: WebSocket, socketUser: SocketUser, { clientToolTimeoutMs }: { clientToolTimeoutMs?: number } = {}) => {
  const { user, hijackedBy } = socketUser
  let activeRun: ActiveRun | null = null

  const send = (message: ChatSocketServerMessage) =>
    new Promise<void>((resolve) => {
      if (ws.readyState !== WebSocket.OPEN) {
        resolve()
        return
      }
      // Resolves once the frame is written, so a slow client slows the run down instead of filling memory.
      ws.send(JSON.stringify(message), (error) => {
        if (error) logger.error('Chat socket write error', { error: error.name })
        resolve()
      })
    })

  const startRun = async ({ runId, input, fileSize, attachedFolders }: RunStartMessage) => {
    const controller = new AbortController()
    const clientTools = createClientToolBridge({
      send: ({ callId, name, input: toolInput }) => void send({ type: 'tool.request', runId, callId, name, input: toolInput }),
      timeoutMs: clientToolTimeoutMs,
    })
    const run: ActiveRun = { runId, controller, clientTools }
    activeRun = run
    const startedAt = Date.now()
    // `attachedFolders` (also an empty list) says that the browser runs the My files tools.
    const folders = canUseClientTools(socketUser) && attachedFolders !== undefined ? parseAttachedFolders(attachedFolders) : null
    const meta: Record<string, unknown> = { streamVersion: 'v4', transport: 'websocket', fileSize, attachedFolderCount: folders?.length || undefined }

    // An aborted run may still be winding down; it must not write into the next run.
    const emit = async (event: ChatEvent) => {
      if (controller.signal.aborted) return
      await send({ type: 'run.event', runId, event })
    }

    let result: RunEndResult
    try {
      const runResult = await runAgent({
        user,
        // If an admin hijacks a user in production, the admin pays.
        chargeUser: inProduction && hijackedBy ? hijackedBy : user,
        request: input,
        meta,
        signal: controller.signal,
        onStart: () => {
          meta.timeToStreamStart = Date.now() - startedAt
        },
        emit,
        clientTools: folders ? { attachedFolders: folders, call: clientTools.call } : undefined,
      })
      result = runResult
    } catch (error) {
      result = toErrorResult(error)
    } finally {
      // Results arriving after the run are ignored.
      clientTools.close('The run has ended.')
      if (activeRun === run) activeRun = null
    }

    await send({ type: 'run.end', runId, result })
    logRun(user, result, Date.now() - startedAt, meta)
  }

  ws.on('message', (data: RawData, isBinary: boolean) => {
    const parsed = parseClientMessage(data, isBinary)
    if ('invalid' in parsed) {
      // A run that cannot start is ended, so the client does not wait for it.
      void send(
        parsed.runId
          ? { type: 'run.end', runId: parsed.runId, result: { status: 'error', error: parsed.invalid, code: 400 } }
          : { type: 'error', error: parsed.invalid },
      )
      return
    }
    const message = parsed.message

    switch (message.type) {
      case 'run.start':
        if (activeRun) {
          void send({ type: 'run.end', runId: message.runId, result: { status: 'error', error: 'A run is already in progress', code: 409 } })
          return
        }
        void startRun(message)
        return

      case 'tool.result':
        // Only the running run's own calls; anything else (an old run, an unknown or finished call) is ignored.
        if (activeRun?.runId === message.runId && !activeRun.clientTools.resolve(message.callId, message.result)) {
          logger.info('Ignoring a tool.result for an unknown or finished call')
        }
        return

      case 'run.abort':
        if (activeRun?.runId === message.runId) {
          activeRun.clientTools.close('The run was aborted.')
          activeRun.controller.abort('client_aborted')
          // The aborted run frees the connection at once, so the next message is not refused while it winds down.
          activeRun = null
        }
        return
    }
  })

  ws.on('close', () => {
    if (activeRun) {
      logger.info('Chat socket closed, aborting agent run')
      activeRun.clientTools.close()
      activeRun.controller.abort('client_disconnected')
      activeRun = null
    }
  })

  ws.on('error', (error) => {
    logger.error('Chat socket error', { error: error.message })
  })
}

type ClientMessage = z.output<typeof ChatSocketClientMessageSchema>
type RunStartMessage = Extract<ClientMessage, { type: 'run.start' }>

const parseClientMessage = (data: RawData, isBinary: boolean): { message: ClientMessage } | { invalid: string; runId?: string } => {
  if (isBinary) return { invalid: 'Invalid message' }
  let json: unknown
  try {
    json = JSON.parse(data.toString())
  } catch {
    return { invalid: 'Invalid message' }
  }
  const parsed = ChatSocketClientMessageSchema.safeParse(json)
  if (parsed.success) return { message: parsed.data }

  // Only a run.start is answered by ending its run; a malformed message for a running run must not end it.
  const { type, runId } = (json ?? {}) as { type?: unknown; runId?: unknown }
  return { invalid: 'Invalid request', runId: type === 'run.start' && typeof runId === 'string' && runId.length > 0 ? runId : undefined }
}

/** The error the HTTP route's error handler would have answered with. */
const toErrorResult = (error: unknown): RunEndResult => {
  if (error instanceof ApplicationError) {
    if (!error.silenced && error.status >= 500) logUnexpected(error)
    return { status: 'error', error: error.message, code: error.status }
  }
  logUnexpected(error)
  return { status: 'error', error: error instanceof Error ? error.message : 'Something went wrong. Please try again.', code: 500 }
}

const logUnexpected = (error: unknown) => {
  logger.error('Chat socket run failed', { error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error })
  Sentry.captureException(error)
}

/** The same fields as the HTTP request log (`requestLogger` with `chatCompletionMeta`). */
const logRun = (user: User, result: RunEndResult, responseTime: number, meta: Record<string, unknown>) => {
  const status = result.status === 'error' ? result.code : result.status === 'warnings' ? 201 : 200
  logger.info(`WS ${CHAT_SOCKET_PATH} run ${status} - ${responseTime} ms`, {
    ...(inProduction || inStaging ? { userId: user.username, url: CHAT_SOCKET_PATH, status, responseTime } : {}),
    runStatus: result.status,
    ...meta,
  })
}
