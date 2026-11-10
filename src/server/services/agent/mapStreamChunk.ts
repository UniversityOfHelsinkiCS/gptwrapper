import { AIMessage, ToolMessage } from '@langchain/core/messages'
import type { ChatEvent } from '@shared/agentChat'
import type { ToolProgressPayload } from './tools/types'

/**
 * One item of `agent.stream(…, { streamMode: ['messages', 'updates', 'custom'], subgraphs: true })`.
 * - `messages`: data is `[messageChunk, metadata]`
 * - `updates`: data is `{ [nodeName]: stateUpdate }`
 * - `custom`: data is whatever a tool wrote with `config.writer`
 */
export type StreamChunk = [namespace: string[], mode: 'messages' | 'updates' | 'custom', data: unknown]

/**
 * What the mapping has learned from earlier chunks of the same run.
 *
 * The id in a `tools:<id>` namespace segment is the LangGraph task id of the tool node, not the model's tool
 * call id, which is what events must carry. `taskCallIds` maps one to the other. It is filled from chunks
 * that name both: a tool's `ToolMessage` (streamed under its own `tools:<task>` namespace) and the
 * `tool.progress` payloads written by `writeToolProgress`.
 */
export type StreamState = { readonly taskCallIds: ReadonlyMap<string, string> }

export const INITIAL_STREAM_STATE: StreamState = { taskCallIds: new Map() }

const TOOLS_SEGMENT = 'tools:'

const toolTaskId = (segment: string | undefined): string | null => (segment?.startsWith(TOOLS_SEGMENT) ? segment.slice(TOOLS_SEGMENT.length) : null)

/**
 * Maps a stream namespace to a `ChatEvent` path: one entry per `tools:<task>` segment (as the tool call id
 * when known), so `[]` is the main agent and `['<callId>']` an agent running inside a tool. Other segments
 * (`model_request:<id>`) are the node that produced the chunk and do not change which agent it belongs to.
 */
export const namespaceToPath = (namespace: string[], state: StreamState = INITIAL_STREAM_STATE): string[] =>
  namespace.flatMap((segment) => {
    const taskId = toolTaskId(segment)
    return taskId === null ? [] : [state.taskCallIds.get(taskId) ?? taskId]
  })

const isToolProgressPayload = (data: unknown): data is ToolProgressPayload =>
  typeof data === 'object' &&
  data !== null &&
  (data as ToolProgressPayload).type === 'tool.progress' &&
  typeof (data as ToolProgressPayload).callId === 'string'

/** The call id that the last `tools:<task>` segment of the namespace stands for, if the chunk tells it. */
const callIdOfChunk = ([, mode, data]: StreamChunk): string | null => {
  if (mode === 'custom' && isToolProgressPayload(data)) return data.callId
  if (mode === 'messages' && Array.isArray(data) && ToolMessage.isInstance(data[0])) return data[0].tool_call_id
  return null
}

/** Pure state transition: learns the tool call id of the chunk's innermost `tools:<task>` segment. Returns `state` when nothing new is learned. */
export const nextStreamState = (state: StreamState, chunk: StreamChunk): StreamState => {
  const taskId = toolTaskId(chunk[0].findLast((segment) => segment.startsWith(TOOLS_SEGMENT)))
  const callId = callIdOfChunk(chunk)
  if (taskId === null || callId === null || state.taskCallIds.get(taskId) === callId) return state
  return { taskCallIds: new Map(state.taskCallIds).set(taskId, callId) }
}

/**
 * Text of a streamed AI message chunk. `contentBlocks` normalises the provider formats: Azure (Responses
 * API) streams an array of `{ type: 'text', text, index }`, Gemini a plain string or, when a chunk has
 * several parts, an array that may contain thought parts (which become `reasoning` blocks and are skipped).
 */
const textOf = (message: AIMessage | ToolMessage): string =>
  message.contentBlocks
    .filter((block) => block.type === 'text')
    .map((block) => (typeof block.text === 'string' ? block.text : ''))
    .join('')

const mapMessagesChunk = (namespace: string[], data: unknown, state: StreamState): ChatEvent[] => {
  if (!Array.isArray(data)) return []
  const [message] = data as [unknown, unknown]
  // Tool messages are also streamed here (under their `tools:` namespace); tool events come from `updates`.
  if (!AIMessage.isInstance(message)) return []

  const text = textOf(message)
  if (text.length === 0) return []
  return [{ type: 'text.delta', path: namespaceToPath(namespace, state), text }]
}

/**
 * Tool calls come from the finished model call (`model_request` update), so their input is complete; tool
 * results from the `tools` node update. Both carry the model's tool call id. Tool-argument chunks in
 * `messages` mode are not streamed.
 */
const mapUpdatesChunk = (namespace: string[], data: unknown, state: StreamState): ChatEvent[] => {
  if (typeof data !== 'object' || data === null) return []
  const path = namespaceToPath(namespace, state)
  const updates = data as Record<string, { messages?: unknown[] } | null | undefined>

  const toolStarts: ChatEvent[] = (updates.model_request?.messages ?? [])
    .filter((message): message is AIMessage => AIMessage.isInstance(message))
    .flatMap((message) => message.tool_calls ?? [])
    .flatMap((call) => (call.id ? [{ type: 'tool.start' as const, path, callId: call.id, name: call.name, input: call.args }] : []))

  const toolEnds: ChatEvent[] = (updates.tools?.messages ?? [])
    .filter((message): message is ToolMessage => ToolMessage.isInstance(message))
    .map((message) => ({
      type: 'tool.end' as const,
      path,
      callId: message.tool_call_id,
      status: message.status === 'error' ? ('error' as const) : ('ok' as const),
      // The artifact is the part meant for the client; the content is what the model read.
      result: message.artifact !== undefined ? message.artifact : textOf(message),
    }))

  return [...toolStarts, ...toolEnds]
}

const mapCustomChunk = (namespace: string[], data: unknown, state: StreamState): ChatEvent[] => {
  if (!isToolProgressPayload(data)) return []
  // The chunk comes from inside the tool, so its namespace ends with the tool's own segment; the event's path is the agent that called it.
  const path = namespaceToPath(namespace, state)
  if (path.at(-1) === data.callId) path.pop()
  return [{ type: 'tool.progress', path, callId: data.callId, data: data.data }]
}

/**
 * Pure mapping of one `agent.stream` chunk to protocol events, given the state learned from the earlier chunks
 * (see `nextStreamState`, which the caller applies first). Reasoning and subagent events come in later slices.
 */
export const mapStreamChunk = ([namespace, mode, data]: StreamChunk, state: StreamState = INITIAL_STREAM_STATE): ChatEvent[] => {
  switch (mode) {
    case 'messages':
      return mapMessagesChunk(namespace, data, state)
    case 'updates':
      return mapUpdatesChunk(namespace, data, state)
    case 'custom':
      return mapCustomChunk(namespace, data, state)
    default:
      return []
  }
}

/** Maps a whole run, threading the state through. For tests and replays. */
export const mapStreamChunks = (chunks: StreamChunk[]): ChatEvent[] => {
  let state = INITIAL_STREAM_STATE
  return chunks.flatMap((chunk) => {
    state = nextStreamState(state, chunk)
    return mapStreamChunk(chunk, state)
  })
}

export type ModelCallSummary = {
  inputTokens: number
  outputTokens: number
  toolCalls: string[]
}

/**
 * For an `updates` chunk in which the **main** agent's model node finished a call, returns that call's
 * token usage and the names of the tools it called. Returns null for anything else (token chunks, tool
 * results, subagent updates). The runner sums these over the run, so every model call is counted.
 */
export const getMainAgentModelCall = ([namespace, mode, data]: StreamChunk): ModelCallSummary | null => {
  if (mode !== 'updates' || namespaceToPath(namespace).length > 0) return null

  const update = (data as Record<string, { messages?: unknown[] } | undefined> | null)?.model_request
  const aiMessages = (update?.messages ?? []).filter((message): message is AIMessage => AIMessage.isInstance(message))
  if (aiMessages.length === 0) return null

  return aiMessages.reduce<ModelCallSummary>(
    (summary, message) => ({
      inputTokens: summary.inputTokens + (message.usage_metadata?.input_tokens ?? 0),
      outputTokens: summary.outputTokens + (message.usage_metadata?.output_tokens ?? 0),
      toolCalls: [...summary.toolCalls, ...(message.tool_calls ?? []).map((call) => call.name)],
    }),
    { inputTokens: 0, outputTokens: 0, toolCalls: [] },
  )
}
