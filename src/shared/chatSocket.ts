import type { AiApiWarning } from './aiApi'
import type { ChatEvent, PostStreamSchemaV4Type } from './agentChat'

/**
 * Chat over a WebSocket (`/api/ai/v4/ws`): the same runs and `ChatEvent`s as `POST /api/ai/v4/stream`.
 * One socket per browser tab, one run at a time per socket. Every message is one JSON text frame and
 * belongs to a run by its `runId`, which the client picks (unique per socket). The server validates
 * client messages with `ChatSocketClientMessageSchema` in `server/routes/ai/v4Socket.ts`.
 *
 * Client-executed tools (the My files tools, `fileTools.ts`): when the agent calls one, the server sends
 * `tool.request` and waits for the `tool.result` with the same `runId` and `callId`. Results for other runs, unknown
 * calls or calls that already ended (answered or timed out) are ignored. A call that gets no result in time ends
 * as an error for the model, and the run goes on.
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
      /**
       * Top-level My files folders attached to the chat. Sent (also as an empty list) when the browser can run the
       * client-executed My files tools: the run then gets them (admins only), with `Outputs/` and `Agent notes/`
       * always visible. Only the browser decides what the tools can read and write: it checks every path itself.
       */
      attachedFolders?: string[]
    }
  | { type: 'run.abort'; runId: string }
  | { type: 'tool.result'; runId: string; callId: string; result: ClientToolResult }

/**
 * The browser's answer to a `tool.request`. `content` is what the model reads, `artifact` what the chat shows and
 * keeps in the history (short, see `FileToolSummary`). `error` is read by the model too, so it says what went wrong.
 */
export type ClientToolResult = { status: 'ok'; content: string; artifact?: unknown } | { status: 'error'; error: string }

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
  /** Asks the browser to run a client-executed tool. `callId` is the model's tool call id, as in the `tool.*` events. */
  | { type: 'tool.request'; runId: string; callId: string; name: string; input: unknown }
  /** A message that could not be read, so it has no run to answer to. */
  | { type: 'error'; error: string }
