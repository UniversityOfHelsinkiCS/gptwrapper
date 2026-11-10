import type { StructuredToolInterface, ToolRunnableConfig } from '@langchain/core/tools'
import type { ZodType } from 'zod/v4'
import type { ValidModelName } from '@config'
import type { ToolPart } from '@shared/agentChat'
import type { User } from '@shared/user'
import type { ChatInstance } from '../../../db/models'

/**
 * What a tool may know about the run that creates it. Deliberately not the `Prompt`: the teacher agent will
 * later be a bigger entity than a prompt, and tools get their settings through `config` instead.
 */
export type ToolContext<Config = unknown> = {
  /** The user chatting. Tool results are stored per user. */
  user: User
  /** The course of the chat, null in the general chat. */
  course: ChatInstance | null
  model: ValidModelName
  /** Settings of this tool for this run (for `document_search`, the RAG index). */
  config: Config
  signal: AbortSignal
}

/**
 * A tool in the registry. The registry is the single source of truth for which tools exist; prompts only
 * enable them by name. Progress is written from inside the tool with `writeToolProgress`.
 */
export type ToolModule<Config = unknown> = {
  name: string
  kind: 'tool' | 'subagent'
  /** `client` tools run in the browser (phase 2). */
  executor: 'server' | 'client'
  /** `experimental` tools can only be enabled by admins. */
  stage: 'experimental' | 'stable'
  returnDirect?: boolean
  /** English instructions appended to the system message under `## Tool: <name>` when the tool is enabled. */
  instructions?: string
  /** Schema of the per-prompt config that teachers can set (issue 06). */
  configSchema?: ZodType
  create: (ctx: ToolContext<Config>) => StructuredToolInterface
  /** Text that replaces a tool part of an earlier answer in the history sent to the model. */
  summarizeForHistory: (part: ToolPart) => string
}

/** A tool enabled for one run, with its config. */
export type EnabledTool = { name: string; config?: unknown }

/** Custom stream payload of `writeToolProgress`, mapped to a `tool.progress` event by `mapStreamChunk`. */
export type ToolProgressPayload = { type: 'tool.progress'; callId: string; data: unknown }

/** Reports progress of a running tool to the client as a `tool.progress` event. `runtime` is the tool function's second argument. */
export const writeToolProgress = (runtime: ToolRunnableConfig & { writer?: ((chunk: unknown) => void) | null }, data: unknown) => {
  const callId = runtime.toolCall?.id
  if (!callId || !runtime.writer) return
  runtime.writer({ type: 'tool.progress', callId, data } satisfies ToolProgressPayload)
}
