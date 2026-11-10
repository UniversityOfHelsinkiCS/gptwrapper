import z from 'zod/v4'
import { ChatMessageSchema, PostStreamSchemaV3, type MessageGenerationInfo } from './chat'

/**
 * Agent stream protocol (v4). See .scratch/agent-architecture/plan.md, section 3.
 * path = [] for the main agent, ['<callId>'] for a subagent, ['<callId>', '<callId2>'] for nested subagents.
 * `callId` is always the model's tool call id. More event types (reasoning, subagent) are added in later slices.
 */
export type ChatEvent =
  | { type: 'text.delta'; path: string[]; text: string }
  /** A tool call whose input is complete. Tool-argument chunks are not streamed. */
  | { type: 'tool.start'; path: string[]; callId: string; name: string; input: unknown }
  /** Whatever a running tool reports about its progress (written with `writeToolProgress`). */
  | { type: 'tool.progress'; path: string[]; callId: string; data: unknown }
  /** `result` is what the client shows (the tool's artifact when it has one); `artifact` is reserved for larger client-only payloads. */
  | { type: 'tool.end'; path: string[]; callId: string; status: 'ok' | 'error'; result: unknown; artifact?: unknown }
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  | { type: 'error'; error: string }
  | { type: 'processing' }

export type ToolPartStatus = 'running' | 'ok' | 'error'

const TextPartSchema = z.object({ type: z.literal('text'), text: z.string() })

const ToolPartSchema = z.object({
  type: z.literal('tool'),
  callId: z.string(),
  name: z.string(),
  input: z.unknown(),
  status: z.enum(['running', 'ok', 'error']),
  result: z.unknown().optional(),
  artifact: z.unknown().optional(),
  /** Latest `tool.progress` data, while the tool runs. */
  progress: z.unknown().optional(),
})

/** More part types (reasoning, subagent) are added in later slices. */
export const AssistantPartSchema = z.discriminatedUnion('type', [TextPartSchema, ToolPartSchema])

export type AssistantPart = z.infer<typeof AssistantPartSchema>
export type ToolPart = Extract<AssistantPart, { type: 'tool' }>

export type AssistantMessageV2 = {
  role: 'assistant'
  parts: AssistantPart[]
  error?: string
  generationInfo?: MessageGenerationInfo
}

/**
 * An assistant message in the history sent to the server. The server turns its parts into text for the model
 * (tool parts through `ToolModule.summarizeForHistory`), never into real tool calls.
 */
export const HistoryAssistantMessageSchema = z.object({
  role: z.literal('assistant'),
  parts: z.array(AssistantPartSchema),
})

export type HistoryAssistantMessage = z.infer<typeof HistoryAssistantMessageSchema>

/** Request body for POST /api/ai/v4/stream. Like v3, but assistant messages may carry `parts` instead of `content`. */
export const PostStreamSchemaV4 = PostStreamSchemaV3.extend({
  options: PostStreamSchemaV3.shape.options.extend({
    chatMessages: z.array(z.union([HistoryAssistantMessageSchema, ChatMessageSchema])),
  }),
})
export type PostStreamSchemaV4Type = z.input<typeof PostStreamSchemaV4>
