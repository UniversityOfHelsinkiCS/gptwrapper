import type { ClientToolResult } from '@shared/chatSocket'

/** How long a client-executed tool call waits for the browser's `tool.result`. */
export const CLIENT_TOOL_TIMEOUT_MS = 60_000

/** Most characters of a client tool's `content` that reach the model. The browser caps its results well below this. */
export const MAX_CLIENT_TOOL_CONTENT_CHARS = 100_000
/** Most characters of a client tool's `artifact` (as JSON). It is stored with the chat, so it must stay small. */
export const MAX_CLIENT_TOOL_ARTIFACT_CHARS = 8_000

export type ClientToolRequest = { callId: string; name: string; input: unknown }

/** Runs a client-executed tool in the browser and resolves with its result. Resolves with an error result on timeout or a closed socket. */
export type ClientToolCaller = (request: ClientToolRequest, signal: AbortSignal) => Promise<ClientToolResult>

type PendingCall = { resolve: (result: ClientToolResult) => void; cleanup: () => void }

/**
 * The server side of client-executed tools for one run: sends `tool.request`s (through `send`) and resolves each
 * call with the matching `tool.result`. Results for calls it does not know, or that already ended, are ignored.
 */
export const createClientToolBridge = ({ send, timeoutMs = CLIENT_TOOL_TIMEOUT_MS }: { send: (request: ClientToolRequest) => void; timeoutMs?: number }) => {
  const pending = new Map<string, PendingCall>()
  let closedReason: string | null = null

  const finish = (callId: string, result: ClientToolResult) => {
    const call = pending.get(callId)
    if (!call) return false
    pending.delete(callId)
    call.cleanup()
    call.resolve(result)
    return true
  }

  const call: ClientToolCaller = (request, signal) =>
    new Promise<ClientToolResult>((resolve, reject) => {
      if (closedReason) {
        resolve({ status: 'error', error: closedReason })
        return
      }
      if (signal.aborted) {
        reject(signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason ?? 'aborted')))
        return
      }
      if (pending.has(request.callId)) {
        resolve({ status: 'error', error: 'This tool call is already running.' })
        return
      }

      const timer = setTimeout(() => finish(request.callId, { status: 'error', error: `The browser did not answer within ${timeoutMs / 1000} s.` }), timeoutMs)
      const onAbort = () => {
        if (!pending.has(request.callId)) return
        pending.delete(request.callId)
        clearTimeout(timer)
        reject(signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason ?? 'aborted')))
      }
      signal.addEventListener('abort', onAbort, { once: true })

      pending.set(request.callId, {
        resolve,
        cleanup: () => {
          clearTimeout(timer)
          signal.removeEventListener('abort', onAbort)
        },
      })
      send(request)
    })

  return {
    call,
    /** Ends the call `callId` with the browser's result. Returns false (and does nothing) for an unknown or finished call. */
    resolve: (callId: string, result: ClientToolResult) => finish(callId, sanitizeResult(result)),
    /** Ends every waiting call as an error, and every later call at once: the browser can no longer answer. */
    close: (reason = 'The connection to the browser closed.') => {
      closedReason = reason
      for (const callId of [...pending.keys()]) finish(callId, { status: 'error', error: reason })
    },
    get pendingCount() {
      return pending.size
    },
  }
}

export type ClientToolBridge = ReturnType<typeof createClientToolBridge>

/** Caps what the browser sent, which the server does not trust to be small. */
const sanitizeResult = (result: ClientToolResult): ClientToolResult => {
  if (result.status === 'error') return { status: 'error', error: result.error.slice(0, 2000) }
  const content =
    result.content.length > MAX_CLIENT_TOOL_CONTENT_CHARS
      ? `${result.content.slice(0, MAX_CLIENT_TOOL_CONTENT_CHARS)}\n[Result cut to fit the limit.]`
      : result.content
  const artifactJson = result.artifact === undefined ? undefined : JSON.stringify(result.artifact)
  const artifact = artifactJson !== undefined && artifactJson.length <= MAX_CLIENT_TOOL_ARTIFACT_CHARS ? result.artifact : undefined
  return { status: 'ok', content, ...(artifact !== undefined ? { artifact } : {}) }
}
