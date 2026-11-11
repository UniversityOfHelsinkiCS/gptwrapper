import type { StructuredToolInterface, ToolRunnableConfig } from '@langchain/core/tools'
import type { ZodType } from 'zod/v4'
import type { ValidModelName } from '@config'
import type { SubagentPart, ToolPart } from '@shared/agentChat'
import type { ToolStage } from '@shared/promptTools'
import type { User } from '@shared/user'
import type { ChatInstance } from '../../../db/models'
import type { ClientToolCaller } from '../clientTools'

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
  /** Runs a client-executed tool in the browser. Only set for runs over the chat socket that have client tools. */
  callClientTool?: ClientToolCaller
}

/**
 * A tool in the registry. The registry is the single source of truth for which tools exist; prompts only
 * enable them by name. Progress is written from inside the tool with `writeToolProgress`.
 *
 * A `subagent` is a tool that runs an agent of its own with `runSubagent`. Its tool schema must have a string
 * `task`, which the client shows on the subagent card. The client shows it as a subagent part with the
 * subagent's own parts nested in it, and its model calls are not charged to the user (see `runAgent`).
 */
export type ToolModule<Config = unknown> = PlainToolModule<Config> | SubagentToolModule<Config>

export type PlainToolModule<Config = unknown> = ToolModuleBase<Config> & {
  kind: 'tool'
  /** Text that replaces a tool part of an earlier answer in the history sent to the model. */
  summarizeForHistory: (part: ToolPart) => string
}

export type SubagentToolModule<Config = unknown> = ToolModuleBase<Config> & {
  kind: 'subagent'
  /** Text that replaces a subagent part of an earlier answer in the history sent to the model. */
  summarizeForHistory: (part: SubagentPart) => string
  /**
   * Most calls of this subagent in one run (plan section 6), `DEFAULT_SUBAGENT_CALLS_PER_RUN` by default. Further
   * calls end as an error the model reads, so it answers with what it has.
   */
  maxCallsPerRun?: number
}

export const DEFAULT_SUBAGENT_CALLS_PER_RUN = 3

type ToolModuleBase<Config> = {
  name: string
  /** `client` tools run in the browser (phase 2). */
  executor: 'server' | 'client'
  /** `experimental` tools can only be added to a prompt by admins. */
  stage: ToolStage
  /**
   * Set when the tool can be turned on per prompt (`Prompt.tools`): the translation keys of its checkbox in the
   * prompt editor. Tools without it are enabled some other way (`document_search` from the prompt's RAG index,
   * `mock_subagent` for the mock model only) and are never listed in `GET /api/tools` or accepted on save.
   */
  promptOption?: { labelKey: string; descriptionKey: string }
  returnDirect?: boolean
  /**
   * English instructions appended to the system message under `## Tool: <name>` when the tool is enabled. A function
   * gets the tool's config for the run (for the file tools, the attached folders).
   */
  instructions?: string | ((config: Config) => string)
  /** Schema of the per-prompt `config`, checked when a prompt is saved. Without it, a prompt cannot give the tool a config. */
  configSchema?: ZodType
  create: (ctx: ToolContext<Config>) => StructuredToolInterface
}

/**
 * A failure the model should read as it is (the tool part also ends as `error`). Other errors thrown by a tool reach
 * the model only as a generic "the tool failed".
 */
export class ToolError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ToolError'
  }
}

/** A tool enabled for one run, with its config. */
export type EnabledTool = { name: string; config?: unknown }

/** Custom stream payload of `writeToolProgress`, mapped to a `tool.progress` event by `mapStreamChunk`. */
export type ToolProgressPayload = { type: 'tool.progress'; callId: string; data: unknown }

/**
 * Custom stream payload that a subagent writes before it starts (see `runSubagent`). It is not an event: it tells
 * `nextStreamState` which tool call id the `tools:<task>` namespace segment of the subagent's own chunks stands for.
 * The tool's custom chunks are streamed under its caller's namespace, so the segment is read from the tool's
 * `checkpoint_ns` instead.
 */
export type SubagentRunPayload = { type: 'subagent.run'; callId: string; namespaceSegment: string }

export type ToolRuntime = ToolRunnableConfig & { writer?: ((chunk: unknown) => void) | null }

/** Reports progress of a running tool to the client as a `tool.progress` event. `runtime` is the tool function's second argument. */
export const writeToolProgress = (runtime: ToolRuntime, data: unknown) => {
  const callId = runtime.toolCall?.id
  if (!callId || !runtime.writer) return
  runtime.writer({ type: 'tool.progress', callId, data } satisfies ToolProgressPayload)
}
