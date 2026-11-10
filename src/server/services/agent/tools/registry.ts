import type { StructuredToolInterface } from '@langchain/core/tools'
import type { AssistantPart, HistoryAssistantMessage, SubagentPart, ToolPart } from '@shared/agentChat'
import { documentSearch } from './documentSearch'
import { mockSubagent } from './mockSubagent'
import { presentQuiz } from './presentQuiz'
import { summarizeSubagentPart } from './subagent'
import type { EnabledTool, ToolContext, ToolModule } from './types'

/** Every tool the agent can use. The client has a matching registry of renderers (`ChatV2/tools/registry.tsx`). */
const TOOL_MODULES: ToolModule<any>[] = [documentSearch, mockSubagent, presentQuiz]

const toolModules = new Map(TOOL_MODULES.map((module) => [module.name, module]))

export const getToolModule = (name: string): ToolModule | undefined => toolModules.get(name)

export const listToolModules = (): ToolModule[] => [...toolModules.values()]

/** Creates the LangChain tools of the enabled tools. Unknown names are an error in the caller, not something to skip silently. */
export const createTools = (enabled: EnabledTool[], ctx: Omit<ToolContext, 'config'>): StructuredToolInterface[] =>
  enabled.map(({ name, config }) => {
    const module = getToolModule(name)
    if (!module) throw new Error(`Unknown tool: ${name}`)
    const created = module.create({ ...ctx, config })
    // The module's flag decides: createAgent ends the turn after a `returnDirect` tool.
    if (module.returnDirect) created.returnDirect = true
    return created
  })

/** The system message followed by the `instructions` of the enabled tools, each under a `## Tool: <name>` heading. */
export const withToolInstructions = (systemMessage: string, enabled: EnabledTool[]): string => {
  const sections = enabled.flatMap(({ name }) => {
    const instructions = getToolModule(name)?.instructions
    return instructions ? [`## Tool: ${name}\n\n${instructions}`] : []
  })
  return [systemMessage, ...sections].filter((text) => text.length > 0).join('\n\n')
}

const summarizeToolPart = (part: ToolPart): string => {
  const module = getToolModule(part.name)
  return module?.kind === 'tool' ? module.summarizeForHistory(part) : `[Used the tool ${part.name}${part.status === 'error' ? ', which failed' : ''}.]`
}

const summarizeSubagent = (part: SubagentPart): string => {
  const module = getToolModule(part.name)
  return module?.kind === 'subagent' ? module.summarizeForHistory(part) : summarizeSubagentPart(part)
}

const partToHistoryText = (part: AssistantPart): string => {
  switch (part.type) {
    case 'text':
      return part.text
    case 'tool':
      return summarizeToolPart(part)
    case 'subagent':
      return summarizeSubagent(part)
    case 'reasoning':
      // Reasoning is never sent back: it is not needed across turns (the client already leaves it out).
      return ''
  }
}

/**
 * An earlier answer as plain text for the model. Tool and subagent parts become summaries in their place, never
 * real `tool_calls` / `ToolMessage` pairs, which would break on edited or truncated history. Reasoning is dropped.
 */
export const historyMessageToText = (message: HistoryAssistantMessage): string =>
  message.parts
    .map(partToHistoryText)
    .filter((text) => text.length > 0)
    .join('\n\n')
