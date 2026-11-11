import { AIMessage, ToolMessage } from '@langchain/core/messages'
import type { ChatEvent } from '@shared/agentChat'
import type { SubagentRunPayload, ToolProgressPayload } from './tools/types'

/**
 * One item of `agent.stream(…, { streamMode: ['messages', 'updates', 'custom'], subgraphs: true })`.
 * - `messages`: data is `[messageChunk, metadata]`
 * - `updates`: data is `{ [nodeName]: stateUpdate }`
 * - `custom`: data is whatever a tool wrote with `config.writer`
 */
export type StreamChunk = [namespace: string[], mode: 'messages' | 'updates' | 'custom', data: unknown]

/**
 * What the mapping knows about the run: the names of the tools that are subagents (fixed for the run), and
 * what it has learned from earlier chunks.
 *
 * The id in a `tools:<id>` namespace segment is the LangGraph task id of the tool node, not the model's tool
 * call id, which is what events must carry. `taskCallIds` maps one to the other. It is filled from chunks
 * that name both: the `subagent.run` payload a subagent writes before its first chunk (see `runSubagent`), a
 * tool's `ToolMessage` (streamed under its own `tools:<task>` namespace) and the `tool.progress` payloads
 * written by `writeToolProgress`.
 */
export type StreamState = { readonly taskCallIds: ReadonlyMap<string, string>; readonly subagentNames: ReadonlySet<string> }

export const INITIAL_STREAM_STATE: StreamState = { taskCallIds: new Map(), subagentNames: new Set() }

/** The state at the start of a run whose tools with these names are subagents. */
export const createStreamState = (subagentNames: Iterable<string>): StreamState => ({ ...INITIAL_STREAM_STATE, subagentNames: new Set(subagentNames) })

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

const isSubagentRunPayload = (data: unknown): data is SubagentRunPayload =>
  typeof data === 'object' &&
  data !== null &&
  (data as SubagentRunPayload).type === 'subagent.run' &&
  typeof (data as SubagentRunPayload).callId === 'string' &&
  typeof (data as SubagentRunPayload).namespaceSegment === 'string'

/** The task id and call id of one `tools:<task>` segment, if the chunk tells them. */
const taskCallOfChunk = ([namespace, mode, data]: StreamChunk): { taskId: string | null; callId: string } | null => {
  // A subagent names its own segment: its custom chunks are streamed under the namespace of the agent that called it.
  if (mode === 'custom' && isSubagentRunPayload(data)) return { taskId: toolTaskId(data.namespaceSegment), callId: data.callId }

  // Otherwise the chunk comes from inside the tool, and the call id is that of the innermost segment.
  const taskId = toolTaskId(namespace.findLast((segment) => segment.startsWith(TOOLS_SEGMENT)))
  if (mode === 'custom' && isToolProgressPayload(data)) return { taskId, callId: data.callId }
  if (mode === 'messages' && Array.isArray(data) && ToolMessage.isInstance(data[0])) return { taskId, callId: data[0].tool_call_id }
  return null
}

/** Pure state transition: learns which tool call id a `tools:<task>` segment stands for. Returns `state` when nothing new is learned. */
export const nextStreamState = (state: StreamState, chunk: StreamChunk): StreamState => {
  const learned = taskCallOfChunk(chunk)
  if (!learned || learned.taskId === null || state.taskCallIds.get(learned.taskId) === learned.callId) return state
  return { ...state, taskCallIds: new Map(state.taskCallIds).set(learned.taskId, learned.callId) }
}

/**
 * Text of a message's `text` content blocks. `contentBlocks` normalises the provider formats: Azure (Responses
 * API) streams an array of `{ type: 'text', text, index }`, Gemini a plain string or, when a chunk has several
 * parts, an array that may contain thought parts (which become `reasoning` blocks).
 */
const textOf = (message: AIMessage | ToolMessage): string =>
  message.contentBlocks
    .filter((block) => block.type === 'text')
    .map((block) => (typeof block.text === 'string' ? block.text : ''))
    .join('')

type DeltaType = 'text.delta' | 'reasoning.delta'

/**
 * The Responses API streams a reasoning summary as numbered parts. A later part starts with a chunk whose only
 * summary entry is empty (`reasoning_summary_part.added`); `contentBlocks` loses the part index, so the parts
 * would run together without the paragraph break added here.
 */
const startsLaterSummaryPart = (message: AIMessage): boolean => {
  const summary = (message.additional_kwargs?.reasoning as { summary?: { text?: unknown; index?: unknown }[] } | undefined)?.summary
  return summary?.length === 1 && summary[0].text === '' && typeof summary[0].index === 'number' && summary[0].index > 0
}

/**
 * The last chunk of a Responses API stream (`response.completed`) carries the whole response in
 * `response_metadata.output`, from which `contentBlocks` rebuilds the full reasoning summary again. It was
 * already streamed, so its reasoning blocks are skipped.
 */
const isCompletedResponse = (message: AIMessage): boolean => Array.isArray(message.response_metadata?.output)

/**
 * The text and reasoning deltas of one streamed AI message chunk, in block order, adjacent blocks of the same
 * kind joined. Reasoning arrives as `reasoning` content blocks: the Azure reasoning summary (from
 * `additional_kwargs.reasoning`) or Gemini thought parts.
 */
const deltasOf = (message: AIMessage): { type: DeltaType; text: string }[] => {
  const deltas: { type: DeltaType; text: string }[] = startsLaterSummaryPart(message) ? [{ type: 'reasoning.delta', text: '\n\n' }] : []
  const skipReasoning = isCompletedResponse(message)
  // Chat Completions servers such as llama.cpp (Toska) stream reasoning as `delta.reasoning_content`. LangChain keeps
  // it in `additional_kwargs.reasoning_content`, but its OpenAI block translator does not turn it into a reasoning block.
  const reasoningContent = message.additional_kwargs?.reasoning_content
  if (typeof reasoningContent === 'string' && reasoningContent.length > 0 && !message.contentBlocks.some((block) => block.type === 'reasoning')) {
    deltas.push({ type: 'reasoning.delta', text: reasoningContent })
  }
  for (const block of message.contentBlocks) {
    if (block.type === 'reasoning' && skipReasoning) continue
    const delta =
      block.type === 'text'
        ? { type: 'text.delta' as const, text: typeof block.text === 'string' ? block.text : '' }
        : block.type === 'reasoning'
          ? { type: 'reasoning.delta' as const, text: typeof block.reasoning === 'string' ? block.reasoning : '' }
          : null
    if (!delta || delta.text.length === 0) continue
    const last = deltas.at(-1)
    if (last?.type === delta.type) last.text += delta.text
    else deltas.push(delta)
  }
  return deltas
}

const mapMessagesChunk = (namespace: string[], data: unknown, state: StreamState): ChatEvent[] => {
  if (!Array.isArray(data)) return []
  const [message] = data as [unknown, unknown]
  // Tool messages are also streamed here (under their `tools:` namespace); tool events come from `updates`.
  if (!AIMessage.isInstance(message)) return []

  const path = namespaceToPath(namespace, state)
  return deltasOf(message).map(({ type, text }) => ({ type, path, text }))
}

/** The `task` argument every subagent tool has (see `ToolModule`). */
const taskOf = (args: unknown): string => {
  const task = (args as { task?: unknown } | null | undefined)?.task
  return typeof task === 'string' ? task : ''
}

/**
 * Tool calls come from the finished model call (`model_request` update), so their input is complete; tool
 * results from the `tools` node update. Both carry the model's tool call id. Tool-argument chunks in
 * `messages` mode are not streamed. Calls of subagent tools are `subagent.*` events instead of `tool.*`.
 */
const mapUpdatesChunk = (namespace: string[], data: unknown, state: StreamState): ChatEvent[] => {
  if (typeof data !== 'object' || data === null) return []
  const path = namespaceToPath(namespace, state)
  const updates = data as Record<string, { messages?: unknown[] } | null | undefined>
  const isSubagent = (name: string | undefined) => name !== undefined && state.subagentNames.has(name)

  const toolStarts: ChatEvent[] = (updates.model_request?.messages ?? [])
    .filter((message): message is AIMessage => AIMessage.isInstance(message))
    .flatMap((message) => message.tool_calls ?? [])
    .flatMap((call): ChatEvent[] => {
      if (!call.id) return []
      return isSubagent(call.name)
        ? [{ type: 'subagent.start', path, callId: call.id, name: call.name, task: taskOf(call.args) }]
        : [{ type: 'tool.start', path, callId: call.id, name: call.name, input: call.args }]
    })

  const toolEnds: ChatEvent[] = (updates.tools?.messages ?? [])
    .filter((message): message is ToolMessage => ToolMessage.isInstance(message))
    .map((message): ChatEvent => {
      const status = message.status === 'error' ? 'error' : 'ok'
      if (isSubagent(message.name)) return { type: 'subagent.end', path, callId: message.tool_call_id, status }
      return {
        type: 'tool.end',
        path,
        callId: message.tool_call_id,
        status,
        // The artifact is the part meant for the client; the content is what the model read.
        result: message.artifact !== undefined ? message.artifact : textOf(message),
      }
    })

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
 * (see `nextStreamState`, which the caller applies first). The events of a subagent's own agent carry the
 * subagent's call id in their path.
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
export const mapStreamChunks = (chunks: StreamChunk[], initialState: StreamState = INITIAL_STREAM_STATE): ChatEvent[] => {
  let state = initialState
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
  return modelCallOf(data)
}

/**
 * For an `updates` chunk in which a **subagent's** model node finished a call, returns that call's usage and
 * the call id of the subagent it belongs to (the innermost one, for nested subagents). Null for anything else.
 * These calls are not charged to the user, only logged.
 */
export const getSubagentModelCall = ([namespace, mode, data]: StreamChunk, state: StreamState): (ModelCallSummary & { callId: string }) | null => {
  if (mode !== 'updates') return null
  const callId = namespaceToPath(namespace, state).at(-1)
  if (callId === undefined) return null
  const call = modelCallOf(data)
  return call && { ...call, callId }
}

const modelCallOf = (data: unknown): ModelCallSummary | null => {
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
