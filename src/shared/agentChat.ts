import { PostStreamSchemaV3, type MessageGenerationInfo, type PostStreamSchemaV3Type } from './chat'

/**
 * Agent stream protocol (v4). See .scratch/agent-architecture/plan.md, section 3.
 * path = [] for the main agent, ['<callId>'] for a subagent, ['<callId>', '<callId2>'] for nested subagents.
 * More event types (reasoning, tool, subagent) are added in later slices.
 */
export type ChatEvent =
  | { type: 'text.delta'; path: string[]; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  | { type: 'error'; error: string }
  | { type: 'processing' }

/** More part types (reasoning, tool, subagent) are added in later slices. */
export type AssistantPart =
  | { type: 'text'; text: string }
  | { type: 'tool'; callId: string; name: string; input: unknown; status: 'ok' | 'error' | 'running'; result?: unknown; artifact?: unknown }

export type AssistantMessageV2 = {
  role: 'assistant'
  parts: AssistantPart[]
  error?: string
  generationInfo?: MessageGenerationInfo
}

/**
 * Request body for POST /api/ai/v4/stream. Same shape as v3: the client converts assistant
 * `parts` to plain text with `messageToText` before sending, so history is text only.
 */
export const PostStreamSchemaV4 = PostStreamSchemaV3
export type PostStreamSchemaV4Type = PostStreamSchemaV3Type
