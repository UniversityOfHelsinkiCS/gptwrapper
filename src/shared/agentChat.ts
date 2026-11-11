import z from 'zod/v4'
import { WarningTypes } from './aiApi'
import { ChatMessageSchema, MessageGenerationInfoSchema, type MessageGenerationInfo } from './chat'

/**
 * Agent stream protocol (v4). See .scratch/agent-architecture/plan.md, section 3.
 * path = [] for the main agent, ['<callId>'] for a subagent, ['<callId>', '<callId2>'] for nested subagents.
 * `callId` is always the model's tool call id. A subagent's own events carry its call id in their path.
 */
export type ChatEvent =
  | { type: 'text.delta'; path: string[]; text: string }
  /** The model's reasoning (or only its summary), streamed before or between its answer text. Only sent for models with `ModelConfig.reasoning.showSummary`. */
  | { type: 'reasoning.delta'; path: string[]; text: string }
  /** A tool call whose input is complete. Tool-argument chunks are not streamed. */
  | { type: 'tool.start'; path: string[]; callId: string; name: string; input: unknown }
  /** Whatever a running tool reports about its progress (written with `writeToolProgress`). */
  | { type: 'tool.progress'; path: string[]; callId: string; data: unknown }
  /** `result` is what the client shows (the tool's artifact when it has one); `artifact` is reserved for larger client-only payloads. */
  | { type: 'tool.end'; path: string[]; callId: string; status: 'ok' | 'error'; result: unknown; artifact?: unknown }
  /** A tool of kind `subagent` started; it is a subagent part instead of a tool part. `task` is what it was asked to do. */
  | { type: 'subagent.start'; path: string[]; callId: string; name: string; task: string }
  /** The subagent finished. `status` is `error` when its tool call failed. */
  | { type: 'subagent.end'; path: string[]; callId: string; status: 'ok' | 'error' }
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  | { type: 'error'; error: string }
  | { type: 'processing' }

export type ToolPartStatus = 'running' | 'ok' | 'error'

const PartStatusSchema = z.enum(['running', 'ok', 'error'])

const TextPartSchema = z.object({ type: z.literal('text'), text: z.string() })

/**
 * What the model thought before answering, shown collapsed in a thinking block. Never sent back to the model
 * and not part of the message's text (copy, email, download).
 * `startedAt` (client clock, ms) is set while it streams; `durationMs` once the model moved on to answering.
 */
const ReasoningPartSchema = z.object({
  type: z.literal('reasoning'),
  text: z.string(),
  startedAt: z.number().optional(),
  durationMs: z.number().optional(),
})

const ToolPartSchema = z.object({
  type: z.literal('tool'),
  callId: z.string(),
  name: z.string(),
  input: z.unknown(),
  status: PartStatusSchema,
  result: z.unknown().optional(),
  artifact: z.unknown().optional(),
  /** Latest `tool.progress` data, while the tool runs. */
  progress: z.unknown().optional(),
})

type TextPart = z.infer<typeof TextPartSchema>
export type ReasoningPart = z.infer<typeof ReasoningPartSchema>
export type ToolPart = z.infer<typeof ToolPartSchema>

/** Work the main agent delegated to a subagent: its own parts (text, reasoning, tools, nested subagents), shown collapsed in a card. */
export type SubagentPart = {
  type: 'subagent'
  callId: string
  /** The tool name of the subagent. */
  name: string
  task: string
  parts: AssistantPart[]
  status: ToolPartStatus
  /** Latest `tool.progress` data of the subagent's own tool call, while it runs (for `read_pdf`, `ReadPdfProgress`). */
  progress?: unknown
}

export type AssistantPart = TextPart | ReasoningPart | ToolPart | SubagentPart

const SubagentPartSchema: z.ZodType<SubagentPart> = z.object({
  type: z.literal('subagent'),
  callId: z.string(),
  name: z.string(),
  task: z.string(),
  get parts() {
    return z.array(AssistantPartSchema)
  },
  status: PartStatusSchema,
  progress: z.unknown().optional(),
})

export const AssistantPartSchema: z.ZodType<AssistantPart> = z.union([TextPartSchema, ReasoningPartSchema, ToolPartSchema, SubagentPartSchema])

export type AssistantMessageV2 = {
  role: 'assistant'
  parts: AssistantPart[]
  error?: string
  generationInfo?: MessageGenerationInfo
}

/**
 * An assistant message in the history sent to the server. The server turns its parts into text for the model
 * (tool parts through `ToolModule.summarizeForHistory`), never into real tool calls. The client leaves reasoning
 * parts out, and the server ignores any that come anyway.
 */
export const HistoryAssistantMessageSchema = z.object({
  role: z.literal('assistant'),
  parts: z.array(AssistantPartSchema),
})

export type HistoryAssistantMessage = z.infer<typeof HistoryAssistantMessageSchema>

/** Request body for POST /api/ai/v4/stream. Assistant messages in the history may carry `parts` instead of `content`. */
export const PostStreamSchemaV4 = z.object({
  options: z.object({
    chatMessages: z.array(z.union([HistoryAssistantMessageSchema, ChatMessageSchema])),
    generationInfo: MessageGenerationInfoSchema,
    ignoredWarnings: WarningTypes.array().optional(),
    courseId: z.string().optional(),
  }),
  courseId: z.string().optional(),
})
export type PostStreamSchemaV4Type = z.input<typeof PostStreamSchemaV4>
