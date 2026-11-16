import z from 'zod/v4'

/** How long a list of tools a prompt may have. There are only a few tools; this only stops abuse. */
const MAX_PROMPT_TOOLS = 20

/**
 * A tool turned on in a prompt (`Prompt.tools`). `config` is validated on save with the tool's `configSchema`
 * on the server, so it is only `unknown` here.
 */
export const PromptToolSchema = z.object({
  name: z.string().min(1).max(100),
  config: z.unknown().optional(),
})

export const PromptToolsSchema = z.array(PromptToolSchema).max(MAX_PROMPT_TOOLS)

export type PromptTool = z.infer<typeof PromptToolSchema>

/** Who can add the tool to a prompt: `admin` tools only admins, `everyone` tools anyone who can edit the prompt. */
export type ToolAccess = 'admin' | 'everyone'

/** How finished the tool is. `experimental` tools are tagged in the prompt editor. Independent of `ToolAccess`. */
export type ToolMaturity = 'experimental' | 'stable'

/** One item of `GET /api/tools`: a tool the current user can add to a prompt, with the translation keys of its checkbox. */
export type ToolInfo = {
  name: string
  access: ToolAccess
  maturity: ToolMaturity
  labelKey: string
  descriptionKey: string
}
