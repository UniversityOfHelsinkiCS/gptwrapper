import type { AiApiJsonResponse } from '../../../shared/aiApi'
import type { ChatEvent, PostStreamSchemaV4Type } from '../../../shared/agentChat'
import type { ClientToolResult } from '../../../shared/chatSocket'
import { postAbortableStream } from '../../util/apiClient'
import { TypedAbortController, type StreamAbortReason } from './useChatStream'

export type ChatRun = {
  input: PostStreamSchemaV4Type
  /** Carries the attached file, if any. `data` is set from `input`. */
  formData: FormData
  /**
   * Tools the browser runs for the agent (the My files tools: the attached folders, `Outputs/` and `Agent notes/`). Only the WebSocket transport
   * uses them; over HTTP the run has no client tools.
   */
  clientTools?: ClientTools
}

export type ClientTools = {
  /** Sent with the run (also when empty) so the server enables the tools and tells the model about the folders. */
  attachedFolders: string[]
  /** Runs one tool call. Must check the input itself: it comes from the model through the server. */
  execute: (name: string, input: unknown) => Promise<ClientToolResult>
}

/** The server either answers with warnings or an error before streaming, or starts the event stream. */
export type ChatStartResult = AiApiJsonResponse | { events: AsyncIterable<ChatEvent> }

/**
 * How the client runs a chat: over HTTP NDJSON (`HttpChatTransport`) or a WebSocket (`WebSocketChatTransport`
 * in `chatSocket.ts`). `signal.reason` tells why a run was aborted.
 */
export interface ChatTransport {
  start(run: ChatRun): Promise<ChatStartResult>
  abort(reason: StreamAbortReason): void
  readonly signal: AbortSignal
}

/** Reads newline-delimited JSON events. Lines that are not valid JSON are skipped. */
export async function* readNdjsonEvents(stream: ReadableStream<Uint8Array>): AsyncGenerator<ChatEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffered = ''

  function* parseLines(lines: string[]) {
    for (const line of lines) {
      if (line.trim().length === 0) continue
      try {
        yield JSON.parse(line) as ChatEvent
      } catch {
        console.error('Skipping malformed stream line:', line)
      }
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffered += decoder.decode(value, { stream: true })
      const lines = buffered.split('\n')
      buffered = lines.pop() ?? ''
      yield* parseLines(lines)
    }
    buffered += decoder.decode()
    yield* parseLines([buffered])
  } finally {
    reader.releaseLock()
  }
}

/** One chat run over `POST /api/ai/v4/stream`, streaming NDJSON `ChatEvent`s. Create one per run. */
export class HttpChatTransport implements ChatTransport {
  readonly signal: AbortSignal

  /** `controller` is passed by a transport that falls back to HTTP, so its abort still applies. */
  constructor(private controller = new TypedAbortController<StreamAbortReason>()) {
    this.signal = controller.signal
  }

  async start({ input, formData }: ChatRun): Promise<ChatStartResult> {
    formData.set('data', JSON.stringify(input))
    const res = await postAbortableStream('ai/v4/stream', formData, this.controller)
    if ('stream' in res) return { events: readNdjsonEvents(res.stream) }
    return res
  }

  abort(reason: StreamAbortReason) {
    this.controller.abort(reason)
  }
}
