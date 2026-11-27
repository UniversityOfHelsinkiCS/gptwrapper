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
  Azure = 'azure',
  Vertex = 'vertex',
  Toska = 'toska',
  Mock = 'mock',
}

export type ModelDescriptionKey = 'chat:modelDescriptions.premium' | 'chat:modelDescriptions.balanced' | 'chat:modelDescriptions.fastAndCheap'

/** `internal`: enabled, but hidden from the model selector (models used by subagent tools). */
export type ModelTag = 'free' | 'local' | 'open' | 'more' | 'internal'

/**
 * Price in € per 1M tokens. `cacheWrite` is for providers that price writing to the prompt cache separately;
 * without it cache writes are charged at the `input` price.
 */
export type ModelPrice = {
  input: number
  cachedInput: number
  cacheWrite?: number
  output: number
}

/**
 * Reasoning ("thinking") settings of a model. `modelGenerators.ts` translates them per provider: Azure/OpenAI
 * Responses API `reasoning: { effort, summary: 'auto' }`, Gemini `reasoningEffort` (which sets
 * `thinkingConfig.includeThoughts`). With `showSummary` the reasoning is streamed to the user as a thinking block.
 */
export type ModelReasoning = {
  effort: 'low' | 'medium' | 'high'
  showSummary: boolean
}

export type ModelConfig = {
  name: string
  /** Disabled models can't be selected or requested, but keep their price for usage recorded on them earlier. */
  enabled: boolean
  price: ModelPrice
  displayName: string
  /** Total context window (input + output) as documented by the provider. */
  context: number
  provider: ModelProvider
  /** Max output tokens, reasoning included. Reserved from the context window; also sent to opencode. */
  outputLimit: number
  timeoutOverride?: number
  instructions?: string
  temperature?: number
  descriptionKey?: ModelDescriptionKey
  /** Vertex-only: overrides DEFAULT_VERTEX_LOCATION for models not available in that region. */
  modelRegion?: string
  // local inference only, used to choose service in apigw
  service?: string
  tags: ModelTag[]
  /** Models without this show no thinking block. */
  reasoning?: ModelReasoning
}

/**
 * Every model, enabled or not. Disable a model with `enabled: false` instead of commenting it out, so usage recorded on
 * it keeps its price.
 *
 * name: the acual model name, which configures the model to be used and is also the azure deployment name.
 * displayName: the human-readable name shown to users.
 *
 * GPT-6 prices are the lower end of Azure's ranges: the higher end is for input over 272k tokens, which the context
 * settings below never reach.
 */
export const models: ModelConfig[] = [
  {
    name: 'gpt-6-luna',
    enabled: true,
    price: { input: 0.108, cachedInput: 0.011, cacheWrite: 0.135, output: 0.539 },
    displayName: 'GPT-6 Luna',
    // Window is 1_050_000, but input over 272k is billed at 2x; 400k - 128k output keeps input at 272k.
    context: 400_000,
    outputLimit: 128_000,
    descriptionKey: 'chat:modelDescriptions.fastAndCheap',
    provider: ModelProvider.Azure,
    tags: ['free'],
    // medium is the deployment's default effort (Azure echoes it when no effort is sent); the config only adds the reasoning summary.
    reasoning: { effort: 'medium', showSummary: true },
  },
  {
    name: 'gpt-5-mini',
    enabled: true,
    price: { input: 0.25, cachedInput: 0.03, output: 1.98 },
    displayName: 'GPT-5 mini',
    context: 400_000,
    outputLimit: 128_000,
    descriptionKey: 'chat:modelDescriptions.fastAndCheap',
    provider: ModelProvider.Azure,
    tags: ['free', 'more'],
    // medium is the model's default effort; the config only adds the reasoning summary.
    reasoning: { effort: 'medium', showSummary: true },
  },
  {
    name: 'gemma-4-26B-A4B',
    enabled: true,
    // TODO: nominal price for the self-hosted model.
    price: { input: 0.05, cachedInput: 0.05, output: 0.2 },
    displayName: 'Gemma 4',
    context: 16_384,
    outputLimit: 8_192,
    descriptionKey: 'chat:modelDescriptions.fastAndCheap',
    provider: ModelProvider.Toska,
    service: 'v1',
    tags: ['local', 'open', 'free'],
    // Toska is a llama.cpp server, which ignores fields it doesn't use, so this is safe even if no reasoning comes back.
    reasoning: { effort: 'medium', showSummary: true },
  },
  {
    name: 'gpt-4o-mini',
    enabled: true,
    price: { input: 1.09, cachedInput: 0.28, output: 4.35 },
    displayName: 'GPT-4o mini',
    context: 128_000,
    outputLimit: 16_384,
    descriptionKey: 'chat:modelDescriptions.fastAndCheap',
    provider: ModelProvider.Azure,
    tags: ['free', 'more'],
  },
  {
    name: 'gpt-4o',
    enabled: true,
    price: { input: 2.4687, cachedInput: 1.2344, output: 9.8748 },
    displayName: 'GPT-4o',
    context: 128_000,
    outputLimit: 16_384,
    descriptionKey: 'chat:modelDescriptions.fastAndCheap',
    provider: ModelProvider.Azure,
    tags: ['more'],
  },
  {
    name: 'gpt-5.1',
    enabled: true,
    price: { input: 1.24, cachedInput: 0.13, output: 9.88 },
    displayName: 'GPT-5.1',
    context: 400_000,
    outputLimit: 128_000,
    descriptionKey: 'chat:modelDescriptions.fastAndCheap',
    provider: ModelProvider.Azure,
    tags: ['more'],
    reasoning: { effort: 'medium', showSummary: true },
  },
  {
    name: 'gpt-4.1',
    enabled: true,
    price: { input: 1.98, cachedInput: 0.5, output: 7.9 },
    displayName: 'GPT-4.1',
    context: 1_047_576,
    outputLimit: 32_768,
    descriptionKey: 'chat:modelDescriptions.fastAndCheap',
    provider: ModelProvider.Azure,
    tags: ['more'],
  },
  {
    name: 'gpt-6.1-sol',
    enabled: true,
    price: { input: 2.16, cachedInput: 0.11, cacheWrite: 2.7, output: 10.78 },
    displayName: 'GPT-6.1 Sol',
    // Window is 1_050_000, but input over 272k is billed at 2x; 400k - 128k output keeps input at 272k.
    context: 400_000,
    outputLimit: 128_000,
    instructions: formatInstructions,
    provider: ModelProvider.Azure,
    descriptionKey: 'chat:modelDescriptions.premium',
    tags: ['more'],
    // medium is the deployment's default effort (Azure echoes it when no effort is sent); the config only adds the reasoning summary.
    reasoning: { effort: 'medium', showSummary: true },
  },
  {
    name: 'gpt-6.2-sol',
    enabled: true,
    price: { input: 2.16, cachedInput: 0.11, cacheWrite: 2.7, output: 10.78 },
    displayName: 'GPT-6.2 Sol',
    // Window is 1_050_000, but input over 272k is billed at 2x; 400k - 128k output keeps input at 272k.
    context: 400_000,
    outputLimit: 128_000,
    instructions: formatInstructions,
    provider: ModelProvider.Azure,
    descriptionKey: 'chat:modelDescriptions.premium',
    tags: [],
    // medium is the deployment's default effort (Azure echoes it when no effort is sent); the config only adds the reasoning summary.
    reasoning: { effort: 'medium', showSummary: true },
  },
  {
    name: 'gpt-6.1-terra',
    enabled: true,
    price: { input: 1.08, cachedInput: 0.06, cacheWrite: 1.35, output: 5.39 },
    displayName: 'GPT-6.1 Terra',
    // Window is 1_050_000, but input over 272k is billed at 2x; 400k - 128k output keeps input at 272k.
    context: 400_000,
    outputLimit: 128_000,
    instructions: formatInstructions,
    provider: ModelProvider.Azure,
    descriptionKey: 'chat:modelDescriptions.balanced',
    tags: [],
    // medium is the deployment's default effort (Azure echoes it when no effort is sent); the config only adds the reasoning summary.
    reasoning: { effort: 'medium', showSummary: true },
  },
  // {
  //   name: 'DeepSeek-V4-Flash',
  //   displayName: 'DeepSeek V4 Flash',
  //   context: 128_000,
  //   outputLimit: 16_384,
  //   instructions: formatInstructions,
  //   provider: ModelProvider.Azure,
  //   descriptionKey: 'chat:modelDescriptions.balanced',
  // },
  {
    name: 'Mistral-Large-3-1',
    enabled: true,
    // TODO: not in Azure's price list; Terra's price as an overestimate.
    price: { input: 1.08, cachedInput: 0.06, output: 5.39 },
    displayName: 'Mistral Large 3',
    context: 128_000,
    outputLimit: 4_096,
    instructions: formatInstructions,
    provider: ModelProvider.Azure,
    descriptionKey: 'chat:modelDescriptions.balanced',
    tags: [],
  },
  // gemini 3.5 flash lite is not available in EU for now. It is the direct replacement 2.5 flash
  // {
  //   name: 'gemini-3.5-flash-lite',
  //   displayName: 'Gemini 3.5 Flash-Lite',
  //   context: 128_000,
  //   outputLimit: 16_384,
  //   instructions: formatInstructions,
  //   provider: ModelProvider.Vertex,
  //   descriptionKey: 'chat:modelDescriptions.fastAndCheap',
  //   timeoutOverride: 60000,
  //   tags: [],
  //   reasoning: { effort: 'low', showSummary: true },
  // },
  {
    name: 'Qwen3.5',
    enabled: true,
    // TODO: nominal price for the self-hosted model.
    price: { input: 0.05, cachedInput: 0.05, output: 0.2 },
    displayName: 'Qwen 3.5 4B',
    context: 128_000,
    outputLimit: 16_384,
    descriptionKey: 'chat:modelDescriptions.fastAndCheap',
    provider: ModelProvider.Toska,
    service: 'v1',
    // Subagent model (PDF_READER_MODEL), not offered in the model selector.
    tags: ['local', 'open', 'internal'],
  },
  {
    name: 'mock',
    enabled: true,
    price: { input: 0, cachedInput: 0, output: 0 },
    displayName: 'Mock',
    context: 4096,
    outputLimit: 1024,
    provider: ModelProvider.Mock,
    tags: [],
    // The mock reasons only for messages starting with `think`.
    reasoning: { effort: 'low', showSummary: true },
  },
]

/** The enabled models: the ones that can be selected and requested. */
export const validModels: ModelConfig[] = models.filter((model) => model.enabled)

/**
 * Throws when a model's price is not a valid non-negative number, or when a model other than the mock has no input or
 * output price (a model added without a price would otherwise be free).
 */
export const assertModelPrices = (configs: ModelConfig[]): void => {
  for (const { name, price } of configs) {
    if (Object.values(price).some((value) => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      throw new Error(`Model ${name} has an invalid price`)
    }
    if (name !== 'mock' && (price.input <= 0 || price.output <= 0)) throw new Error(`Model ${name} has no price`)
  }
}

assertModelPrices(models)

/** Price of any model, enabled or not. */
export const getModelPrice = (modelName: string): ModelPrice | undefined => models.find((model) => model.name === modelName)?.price

/** Base weekly usage budget of a user in €. Course bonuses add percentages of it. */
export const WEEKLY_BUDGET = Number(process.env.WEEKLY_BUDGET) || 2.5

export const USAGE_ENFORCEMENT_MODES = ['tokens', 'cost'] as const

/** Which usage system blocks users: the old weekly token limit or the weekly cost budget. */
export type UsageEnforcement = (typeof USAGE_ENFORCEMENT_MODES)[number]

export const parseUsageEnforcement = (value: string | undefined): UsageEnforcement => {
  if (value === undefined || value === '') return 'tokens'
  const mode = USAGE_ENFORCEMENT_MODES.find((m) => m === value)
  if (!mode) throw new Error(`Invalid USAGE_ENFORCEMENT ${value}, expected one of ${USAGE_ENFORCEMENT_MODES.join(', ')}`)
  return mode
}

/**
 * The enforcing usage system, from `USAGE_ENFORCEMENT` (default `tokens`). Server only: the client learns it from the
 * user status response. Read at call time so tests can switch it with `vi.stubEnv`.
 */
export const getUsageEnforcement = (): UsageEnforcement => parseUsageEnforcement(process.env.USAGE_ENFORCEMENT)

// Fail at startup on an unknown value.
getUsageEnforcement()

/**
 * How many uncached input, cached input and output tokens a typical chat uses relative to each other. Used to blend a
 * model's prices into one number for the price indicator in the model selector, not for charging.
 */
export const PRICE_BLEND_WEIGHTS = { input: 1, cachedInput: 2, output: 1 } as const

/** Max input tokens: the context window minus the space reserved for output. */
export const inputLimit = (model: Pick<ModelConfig, 'context' | 'outputLimit'>): number => model.context - model.outputLimit

export const vertexModels = validModels.filter((model) => model.provider === ModelProvider.Vertex)

export const ValidModelNameSchema = z.union(validModels.map((model) => z.literal(model.name)))

export type ValidModelName = z.infer<typeof ValidModelNameSchema>

export const getModelConfig = (modelName: ValidModelName): ModelConfig | undefined => validModels.find((model) => model.name === modelName)

export const getModelDisplayName = (modelName: ValidModelName): string => getModelConfig(modelName)?.displayName ?? modelName

export const isMockModel = (modelName: ValidModelName): boolean => modelName === 'mock'

export const isVertexModel = (modelName: ValidModelName): boolean => vertexModels.some((model) => model.name === modelName)

export const DEFAULT_MODEL = ValidModelNameSchema.parse(process.env.DEFAULT_MODEL || 'gpt-6-luna')

export const FREE_MODELS = validModels.filter((model) => model.tags.includes('free')).map((model) => ValidModelNameSchema.parse(model.name))

export const isFreeModel = (modelName: string): boolean => FREE_MODELS.some((name) => name === modelName)

// Fallback when the token limit is exceeded and default for opencode
export const FREE_MODEL = ValidModelNameSchema.parse(process.env.FREE_MODEL || 'gpt-6-luna')

if (!isFreeModel(FREE_MODEL)) throw new Error(`FREE_MODEL ${FREE_MODEL} must be tagged 'free'`)

/**
 * Model of the `read_pdf` subagent, independent of the chat model: by default the cheap local Qwen. Chats with the
 * mock model use the mock model for the subagent too (tests). Each subagent tool has its own model setting.
 */
export const PDF_READER_MODEL = ValidModelNameSchema.parse(process.env.PDF_READER_MODEL || 'Qwen3.5')

export const DEFAULT_ASSISTANT_INSTRUCTIONS = '' // 11th August 2025 we decided it should be empty

export const DEFAULT_MODEL_TEMPERATURE = 1.0

// How long the client waits for the first streamed token before aborting with a
// timeout_error.
// For models that need longer set `timeoutOverride`.
export const DEFAULT_STREAM_TIMEOUT = 20_000

export const DEFAULT_VERTEX_LOCATION = 'europe-north1' // Hamina, Finland

export const supportEmail = 'opetusteknologia@helsinki.fi'

// File type constants for file uploads
export const imageFileTypes = ['image/jpeg', 'image/png']
export const textFileTypes = ['text/plain', 'text/html', 'text/css', 'text/csv', 'text/markdown', 'text/md']
