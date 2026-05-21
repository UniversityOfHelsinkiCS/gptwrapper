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

export enum ModelProvider {
  Azure = "azure",
  Vertex = "vertex",
  Mock = "mock"
}

export type ModelDescriptionKey =
  | 'chat:modelDescriptions.premium'
  | 'chat:modelDescriptions.balanced'
  | 'chat:modelDescriptions.fastAndCheap'

export type ModelConfig = {
  name: string,
  context: number,
  provider: ModelProvider,
  streamVersion: string,
  instructions?: string,
  temperature?: number,
  descriptionKey?: ModelDescriptionKey,
}

export const normalizeVertexModelName = (modelName: string): string =>
  modelName

/**
 * name: the acual model name, which is shown to users, configures the model to be used and is also the azure deployment name.
 */
export const validModels: ModelConfig[] = [
  {
    name: 'gpt-4o-mini',
    context: 128_000,
    streamVersion: 'v3',
    provider: ModelProvider.Azure
  },
  {
    name: 'gpt-5.1',
    context: 128_000,
    streamVersion: 'v3',
    instructions: formatInstructions,
    provider: ModelProvider.Azure,
    descriptionKey: 'chat:modelDescriptions.premium',
  },
  {
    name: 'Mistral-Large-3-1',
    context: 128_000,
    streamVersion: 'v3',
    instructions: formatInstructions,
    provider: ModelProvider.Azure,
    descriptionKey: 'chat:modelDescriptions.balanced',
  },
  {
    name: 'gemini-2.5-flash',
    context: 128_000,
    streamVersion: 'v4',
    instructions: formatInstructions,
    provider: ModelProvider.Vertex,
    descriptionKey: 'chat:modelDescriptions.fastAndCheap',
  },
   {
    name: 'gemini-2.5-pro',
    context: 128_000,
    streamVersion: 'v4',
    instructions: formatInstructions,
    provider: ModelProvider.Vertex,
    descriptionKey: 'chat:modelDescriptions.premium',
  },
  {
    name: 'mock',
    context: 1024,
    streamVersion: 'v3',
    provider: ModelProvider.Mock
  },
] as const


export const vertexModels = validModels.filter((model) => model.provider === ModelProvider.Vertex)


export const ValidModelNameSchema = z.union(validModels.map((model) => z.literal(model.name)))

export type ValidModelName = z.infer<typeof ValidModelNameSchema>

export const getModelConfig = (modelName: ValidModelName): ModelConfig | undefined =>
  validModels.find((model) => model.name === modelName)

export const usesStreamVersion = (modelName: ValidModelName, version: string): boolean =>
  getModelConfig(modelName)?.streamVersion === version

export const isMockModel = (modelName: ValidModelName): boolean => modelName === 'mock'

export const isVertexModel = (modelName: ValidModelName): boolean =>
  vertexModels.some((model) => model.name === normalizeVertexModelName(modelName))

export const DEFAULT_MODEL = ValidModelNameSchema.parse(process.env.DEFAULT_MODEL || 'gpt-4o-mini')

export const FREE_MODEL = ValidModelNameSchema.parse(process.env.FREE_MODEL || 'gpt-4o-mini') // as it was decided in 23th Sept 2024 meeting

export const DEFAULT_ASSISTANT_INSTRUCTIONS = '' // 11th August 2025 we decided it should be empty

export const DEFAULT_MODEL_TEMPERATURE = 1.0

export const DEFAULT_VERTEX_LOCATION = "europe-north1" // Hamina, Finland

export const supportEmail = 'opetusteknologia@helsinki.fi'

// File type constants for file uploads
export const imageFileTypes = ['image/jpeg', 'image/png']
export const textFileTypes = ['text/plain', 'text/html', 'text/css', 'text/csv', 'text/markdown', 'text/md']
