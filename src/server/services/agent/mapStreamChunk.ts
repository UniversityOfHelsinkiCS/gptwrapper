import { AIMessage } from '@langchain/core/messages'
import type { ChatEvent } from '@shared/agentChat'

/**
 * One item of `agent.stream(…, { streamMode: ['messages', 'updates', 'custom'], subgraphs: true })`.
 * - `messages`: data is `[messageChunk, metadata]`
 * - `updates`: data is `{ [nodeName]: stateUpdate }`
 * - `custom`: data is whatever a tool wrote with `config.writer`
 */
export type StreamChunk = [namespace: string[], mode: 'messages' | 'updates' | 'custom', data: unknown]

const TOOLS_SEGMENT = 'tools:'

/**
 * Maps a stream namespace to a `ChatEvent` path: one entry per `tools:<id>` segment, so `[]` is the main
 * agent and `['<id>']` an agent running inside a tool. Other segments (`model_request:<id>`) are the node
 * that produced the chunk and do not change which agent it belongs to.
 *
 * Note: the id in `tools:<id>` is the LangGraph task id of the tool node, not the model's tool call id.
 * Mapping it to the call id is left to the slice that adds subagents (issue 03+).
 */
export const namespaceToPath = (namespace: string[]): string[] =>
  namespace.filter((segment) => segment.startsWith(TOOLS_SEGMENT)).map((segment) => segment.slice(TOOLS_SEGMENT.length))

/**
 * Text of a streamed AI message chunk. `contentBlocks` normalises the provider formats: Azure (Responses
 * API) streams an array of `{ type: 'text', text, index }`, Gemini a plain string or, when a chunk has
 * several parts, an array that may contain thought parts (which become `reasoning` blocks and are skipped).
 */
const textOf = (message: AIMessage): string =>
  message.contentBlocks
    .filter((block) => block.type === 'text')
    .map((block) => (typeof block.text === 'string' ? block.text : ''))
    .join('')

/**
 * Pure mapping of one `agent.stream` chunk to protocol events. Only text is emitted in this slice;
 * reasoning, tool and subagent events come in later slices. Tool messages (also streamed in `messages`
 * mode, under a `tools:` namespace) are ignored.
 */
export const mapStreamChunk = ([namespace, mode, data]: StreamChunk): ChatEvent[] => {
  if (mode !== 'messages' || !Array.isArray(data)) return []

  const [message] = data as [unknown, unknown]
  if (!AIMessage.isInstance(message)) return []

  const text = textOf(message)
  if (text.length === 0) return []

  return [{ type: 'text.delta', path: namespaceToPath(namespace), text }]
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
