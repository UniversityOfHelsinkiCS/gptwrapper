import type { StructuredToolInterface } from '@langchain/core/tools'
import type { AssistantPart, HistoryAssistantMessage, ToolPart } from '@shared/agentChat'
import { documentSearch } from './documentSearch'
import type { EnabledTool, ToolContext, ToolModule } from './types'

/** Every tool the agent can use. The client has a matching registry of renderers (`ChatV2/tools/registry.tsx`). */
const TOOL_MODULES: ToolModule<any>[] = [documentSearch]

const toolModules = new Map(TOOL_MODULES.map((module) => [module.name, module]))

export const getToolModule = (name: string): ToolModule | undefined => toolModules.get(name)

export const listToolModules = (): ToolModule[] => [...toolModules.values()]

/** Creates the LangChain tools of the enabled tools. Unknown names are an error in the caller, not something to skip silently. */
export const createTools = (enabled: EnabledTool[], ctx: Omit<ToolContext, 'config'>): StructuredToolInterface[] =>
  enabled.map(({ name, config }) => {
    const module = getToolModule(name)
    if (!module) throw new Error(`Unknown tool: ${name}`)
    return module.create({ ...ctx, config })
  })

/** The system message followed by the `instructions` of the enabled tools, each under a `## Tool: <name>` heading. */
export const withToolInstructions = (systemMessage: string, enabled: EnabledTool[]): string => {
  const sections = enabled.flatMap(({ name }) => {
    const instructions = getToolModule(name)?.instructions
    return instructions ? [`## Tool: ${name}\n\n${instructions}`] : []
  })
  return [systemMessage, ...sections].filter((text) => text.length > 0).join('\n\n')
}

const summarizeToolPart = (part: ToolPart): string =>
  getToolModule(part.name)?.summarizeForHistory(part) ?? `[Used the tool ${part.name}${part.status === 'error' ? ', which failed' : ''}.]`

const partToHistoryText = (part: AssistantPart): string => (part.type === 'text' ? part.text : summarizeToolPart(part))

/**
 * An earlier answer as plain text for the model. Tool parts become summaries in their place, never real
 * `tool_calls` / `ToolMessage` pairs, which would break on edited or truncated history.
 */
export const historyMessageToText = (message: HistoryAssistantMessage): string =>
  message.parts
    .map(partToHistoryText)
    .filter((text) => text.length > 0)
    .join('\n\n')
