import type { PromptTool, ToolInfo } from '@shared/promptTools'
import type { User } from '@shared/user'
import type { RagIndex } from '../../../db/models'
import { ApplicationError } from '../../../util/ApplicationError'
import logger from '../../../util/logger'
import { DOCUMENT_SEARCH } from './documentSearch'
import { getToolModule, listToolModules } from './registry'
import type { EnabledTool, ToolModule } from './types'

/** A tool module that can be turned on per prompt (one with a `promptOption`). */
type PromptToolModule = ToolModule & { promptOption: NonNullable<ToolModule['promptOption']> }

const getPromptToolModule = (name: string): PromptToolModule | undefined => {
  const module = getToolModule(name)
  return module?.promptOption ? (module as PromptToolModule) : undefined
}

/** `experimental` tools can only be added by admins; `stable` ones by anyone who can edit the prompt. */
const canAddTool = (user: Pick<User, 'isAdmin'>, module: ToolModule) => module.stage === 'stable' || user.isAdmin

/** The tools the user can add to a prompt, for the checkboxes of the prompt editor (`GET /api/tools`). */
export const listAddableTools = (user: Pick<User, 'isAdmin'>): ToolInfo[] =>
  listToolModules().flatMap((module) =>
    module.promptOption && canAddTool(user, module)
      ? [{ name: module.name, stage: module.stage, labelKey: module.promptOption.labelKey, descriptionKey: module.promptOption.descriptionKey }]
      : [],
  )

const parseConfig = (module: ToolModule, config: unknown): Pick<PromptTool, 'config'> => {
  if (!module.configSchema) {
    if (config !== undefined) throw ApplicationError.BadRequest(`The tool ${module.name} takes no config`)
    return {}
  }
  const parsed = module.configSchema.safeParse(config)
  if (!parsed.success) throw ApplicationError.BadRequest(`Invalid config for the tool ${module.name}`)
  return parsed.data === undefined ? {} : { config: parsed.data }
}

/**
 * Checks the tools of a prompt being saved and returns them with parsed configs. Unknown tools (and tools that are
 * not turned on per prompt) and duplicates are 400, an `experimental` tool added by a non-admin is 403.
 * Tools already on the prompt (`current`) may stay, so a teacher can still edit a prompt an admin added one to.
 */
export const validatePromptTools = (user: Pick<User, 'isAdmin'>, requested: PromptTool[], current: PromptTool[] = []): PromptTool[] => {
  const seen = new Set<string>()
  return requested.map(({ name, config }) => {
    const module = getPromptToolModule(name)
    if (!module) throw ApplicationError.BadRequest(`Unknown tool: ${name}`)
    if (seen.has(name)) throw ApplicationError.BadRequest(`Duplicate tool: ${name}`)
    seen.add(name)

    const alreadyOnPrompt = current.some((tool) => tool.name === name)
    if (!alreadyOnPrompt && !canAddTool(user, module)) {
      throw ApplicationError.Forbidden(`Only admins can add the experimental tool ${name}`)
    }

    return { name, ...parseConfig(module, config) }
  })
}

/** The tools of a prompt being copied that the copying user could have added themselves; the others are left out. */
export const copyablePromptTools = (user: Pick<User, 'isAdmin'>, tools: PromptTool[] | null | undefined): PromptTool[] =>
  (tools ?? []).filter((tool) => {
    const module = getPromptToolModule(tool.name)
    return module !== undefined && canAddTool(user, module)
  })

/**
 * The tools a chat with this prompt runs with, whoever is chatting (access was checked on save):
 * `document_search` from the prompt's RAG index, then the prompt's own tools. A tool that is no longer in the
 * registry is skipped, so removing a tool does not break the prompts that had it.
 */
export const promptEnabledTools = (prompt: { tools?: PromptTool[] | null; ragIndex?: RagIndex | null }): EnabledTool[] => {
  const fromRagIndex: EnabledTool[] = prompt.ragIndex ? [{ name: DOCUMENT_SEARCH, config: { ragIndex: prompt.ragIndex } }] : []
  const fromTools = (prompt.tools ?? []).filter((tool) => {
    if (getPromptToolModule(tool.name)) return true
    logger.warn('Skipping a prompt tool that is not in the registry', { tool: tool.name })
    return false
  })
  return [...fromRagIndex, ...fromTools]
}
