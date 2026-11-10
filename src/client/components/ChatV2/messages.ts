import { readMessageContent, type ToolCallResultEvent, type UserMessage } from '../../../shared/chat'
import type { AssistantMessageV2, AssistantPart, PostStreamSchemaV4Type, ToolPart } from '../../../shared/agentChat'
import { finishParts } from './applyEvent'
import { toolPartSource } from './tools/registry'

/** A chat message as the client keeps it in state and localStorage. */
export type ClientChatMessage = UserMessage | AssistantMessageV2

/** Version of the messages saved in localStorage. 2 = assistant messages have `parts`. */
export const MESSAGES_VERSION = 2

type HistoryMessage = PostStreamSchemaV4Type['options']['chatMessages'][number]

/**
 * The plain text of a message. Used for copy, email, download and for the history sent to the model,
 * so they all agree on what a message says. Only text parts: reasoning and tool parts are left out.
 */
export const messageToText = (msg: ClientChatMessage): string => {
  if (msg.role === 'user') return readMessageContent(msg)
  return msg.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n\n')
}

/**
 * Leaves out what the server does not need to summarise parts: reasoning, the client-only artifact and the
 * progress of a running tool, also inside subagent parts.
 */
const toHistoryParts = (parts: AssistantPart[]): AssistantPart[] =>
  parts.flatMap((part): AssistantPart[] => {
    switch (part.type) {
      case 'reasoning':
        return []
      case 'tool': {
        const { artifact: _artifact, progress: _progress, ...rest } = part
        return [rest]
      }
      case 'subagent':
        return [{ ...part, parts: toHistoryParts(part.parts) }]
      default:
        return [part]
    }
  })

/**
 * The conversation as sent to the server: user messages as they are, assistant messages as their parts.
 * The server turns the parts into text for the model, tool and subagent parts as summaries of their tool.
 * Reasoning is never sent back to the model.
 */
export const toHistoryMessages = (messages: ClientChatMessage[]): HistoryMessage[] =>
  messages.map((msg) => (msg.role === 'user' ? msg : { role: 'assistant', parts: toHistoryParts(msg.parts) }))

/**
 * Sources of an assistant message, in the shape the Sources button, side panel and exports use. The client
 * tool registry decides which tool parts are sources (finished document searches).
 */
export const messageToolResults = (msg: AssistantMessageV2): ToolCallResultEvent[] =>
  msg.parts.flatMap((part) => {
    const source = part.type === 'tool' ? toolPartSource(part) : null
    return source ? [source] : []
  })

const toolCallToPart = (toolCall: ToolCallResultEvent): ToolPart => ({
  type: 'tool',
  callId: toolCall.callId,
  name: toolCall.toolName,
  input: toolCall.input,
  status: 'ok',
  result: toolCall.result,
})

const textToParts = (text: string): AssistantPart[] => (text.length > 0 ? [{ type: 'text', text }] : [])

/**
 * Converts one saved message to the current format. Old assistant messages had `content` and `toolCalls`:
 * each tool call becomes a `tool` part (the search ran before the answer was written), followed by the
 * text as a single text part.
 */
export const migrateMessage = (msg: any): ClientChatMessage => {
  if (msg?.role !== 'assistant' || Array.isArray(msg.parts)) return msg

  const { content, toolCalls, ...rest } = msg
  const toolParts = Object.values<ToolCallResultEvent>(toolCalls ?? {}).map(toolCallToPart)
  return { ...rest, parts: [...toolParts, ...textToParts(readMessageContent({ content: content ?? '' }))] }
}

export const migrateMessages = (messages: unknown): ClientChatMessage[] => (Array.isArray(messages) ? messages.map(migrateMessage) : [])

/**
 * Finalizes parts saved while still running (before runs were finalized at their end), so they do not show a
 * spinner forever. Unchanged messages keep their identity.
 */
const finishStoredMessages = (messages: ClientChatMessage[], now: number): ClientChatMessage[] =>
  messages.map((msg) => {
    if (msg.role !== 'assistant') return msg
    const parts = finishParts(msg.parts, now)
    return parts === msg.parts ? msg : { ...msg, parts }
  })

/** Reads the raw localStorage value of a conversation, migrating old formats and finalizing parts left running. */
export const parseStoredMessages = (raw: string | null, now: number = Date.now()): ClientChatMessage[] => {
  if (!raw) return []
  try {
    const stored = JSON.parse(raw) as { value?: unknown; messagesVersion?: number }
    if (stored.messagesVersion === MESSAGES_VERSION && Array.isArray(stored.value)) return finishStoredMessages(stored.value as ClientChatMessage[], now)
    return finishStoredMessages(migrateMessages(stored.value), now)
  } catch (error) {
    console.error('Failed to parse stored chat messages:', error)
    return []
  }
}

export const serializeMessages = (messages: ClientChatMessage[]): string => JSON.stringify({ value: messages, messagesVersion: MESSAGES_VERSION })
