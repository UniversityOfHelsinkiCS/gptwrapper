import type { AiApiWarning } from './aiApi'
import type { ChatEvent, PostStreamSchemaV4Type } from './agentChat'

/**
 * Chat over a WebSocket (`/api/ai/v4/ws`): the same runs and `ChatEvent`s as `POST /api/ai/v4/stream`.
 * One socket per browser tab, one run at a time per socket. Every message is one JSON text frame and
 * belongs to a run by its `runId`, which the client picks (unique per socket). The server validates
 * client messages with `ChatSocketClientMessageSchema` in `server/routes/ai/v4Socket.ts`.
 *
 * Client-executed tools (issue 11) add `tool.request` (server → client) and `tool.result` (client → server)
 * to these unions, also keyed by `runId`.
 */
export const CHAT_SOCKET_PATH = '/api/ai/v4/ws'

/** Query parameter for the hijacked user's id (`x-admin-logged-in-as` on HTTP); browsers cannot set headers on a WebSocket. */
export const CHAT_SOCKET_LOGGED_IN_AS_PARAM = 'loggedInAs'

export type ChatSocketClientMessage =
  | {
      type: 'run.start'
      runId: string
      /** The same body as `POST /api/ai/v4/stream`'s `data` field. */
      input: PostStreamSchemaV4Type
      /** Size of the attached file, for the request log. The file itself is parsed in the browser and is in the history. */
      fileSize?: number
    }
  | { type: 'run.abort'; runId: string }

/** How a run ended. `warnings` and `error` mean nothing was streamed, like the 201 and error responses on HTTP. */
export type RunEndResult =
  | { status: 'completed' }
  | { status: 'aborted' }
  /** The client must confirm the warnings and start again with them in `ignoredWarnings`. */
  | { status: 'warnings'; warnings: AiApiWarning[] }
  /** Refused before streaming, or failed unexpectedly. `code` is the HTTP status the HTTP route would have answered with. */
  | { status: 'error'; error: string; code: number }

export type ChatSocketServerMessage =
  | { type: 'run.event'; runId: string; event: ChatEvent }
  | { type: 'run.end'; runId: string; result: RunEndResult }
  /** A message that could not be read, so it has no run to answer to. */
  | { type: 'error'; error: string }
