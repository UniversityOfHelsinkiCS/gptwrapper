import z from 'zod/v4'

export const inDevelopment = process.env.NODE_ENV === 'development'

export const inStaging = process.env.STAGING === 'true'

export const inProduction = !inStaging && process.env.NODE_ENV === 'production'

export const inCI = process.env.CI === 'true'

export const GIT_SHA = process.env.REACT_APP_GIT_SHA || ''

export const PUBLIC_URL = process.env.PUBLIC_URL || ''

export const DEFAULT_TOKEN_LIMIT = Number(process.env.DEFAULT_TOKEN_LIMIT) || 200_000

export const formatInstructions = `
Always format responses in plain Markdown.
Use Markdown headings (#, ##, ###) only when structuring complex content with clear sections.
Use lists, tables, and blockquotes where useful.
Put math in $$ ... $$ for LaTeX rendering.
Wrap code in triple backticks with the correct language tag (js, ts, py, etc.) so syntax highlighting and rendering work.
`

/**
 * name: the acual model name, which is shown to users, configures the model to be used and is also the azure deployment name.
 */
export const validModels = [
  {
    name: 'gpt-4o',
    context: 128_000,
  },
  {
    name: 'gpt-4o-mini',
    context: 128_000,
  },
  {
    name: 'gpt-4.1',
    context: 128_000,
  },
  {
    name: 'gpt-5',
    context: 128_000,
    temperature: 1.0,
    instructions: formatInstructions,
  },
  // {
  //   name: 'gpt-5.1',
  //   context: 128_000,
  //   temperature: 1.0,
  //   instructions: formatInstructions,
  // },
  {
    name: 'mock',
    context: 1024,
  },
] as const

export const ValidModelNameSchema = z.union(validModels.map((model) => z.literal(model.name)))

export type ValidModelName = z.infer<typeof ValidModelNameSchema>

export const DEFAULT_MODEL = ValidModelNameSchema.parse(process.env.DEFAULT_MODEL || 'gpt-4o-mini')

export const FREE_MODEL = ValidModelNameSchema.parse(process.env.FREE_MODEL || 'gpt-4o-mini') // as it was decided in 23th Sept 2024 meeting

export const DEFAULT_ASSISTANT_INSTRUCTIONS = '' // 11th August 2025 we decided it should be empty
export const DEFAULT_MODEL_TEMPERATURE = 0.5

export const supportEmail = 'opetusteknologia@helsinki.fi'
