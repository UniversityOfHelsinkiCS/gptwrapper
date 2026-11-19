import { getModelPrice, type ModelPrice, models } from '@config'

/** Tokens of one model by type. `input` is uncached input only: cached reads and cache writes are counted separately. */
export type TokenUsage = {
  input: number
  cachedInput: number
  cacheWrite: number
  output: number
}

/** Token usage by model name. Stored as token counts; the cost is always computed from the current config prices. */
export type ModelUsage = Record<string, TokenUsage>

const TOKEN_TYPES = ['input', 'cachedInput', 'cacheWrite', 'output'] as const

export const emptyTokenUsage = (): TokenUsage => ({ input: 0, cachedInput: 0, cacheWrite: 0, output: 0 })

/** Sum of two token usages of one model. Missing token types in `b` count as 0. */
export const addTokenUsage = (a: TokenUsage, b: Partial<TokenUsage>): TokenUsage =>
  Object.fromEntries(TOKEN_TYPES.map((type) => [type, a[type] + (b[type] ?? 0)])) as TokenUsage

/** Sum of two usages. Missing token types count as 0, so partial entries in stored jsonb are fine. */
export const mergeUsage = (a: ModelUsage, b: ModelUsage): ModelUsage => {
  const merged: ModelUsage = {}
  for (const [model, tokens] of [...Object.entries(a), ...Object.entries(b)]) {
    merged[model] = addTokenUsage(merged[model] ?? emptyTokenUsage(), tokens)
  }
  return merged
}

/** Price used for a model that is not in the config at all: the highest price of every type, so it is never free. */
const highestPrice = (): Required<ModelPrice> => {
  const prices = models.map((model) => model.price)
  const max = (pick: (price: ModelPrice) => number) => Math.max(...prices.map(pick))
  return {
    input: max((price) => price.input),
    cachedInput: max((price) => price.cachedInput),
    cacheWrite: max((price) => price.cacheWrite ?? price.input),
    output: max((price) => price.output),
  }
}

/** Cost of a usage in €, with the config prices (per 1M tokens). Cache writes cost the input price unless priced separately. */
export const usageCost = (usage: ModelUsage): number => {
  let cost = 0
  for (const [model, tokens] of Object.entries(usage)) {
    const price = getModelPrice(model) ?? highestPrice()
    cost +=
      ((tokens.input ?? 0) * price.input +
        (tokens.cachedInput ?? 0) * price.cachedInput +
        (tokens.cacheWrite ?? 0) * (price.cacheWrite ?? price.input) +
        (tokens.output ?? 0) * price.output) /
      1_000_000
  }
  return cost
}

/** The token counts of LangChain's `usage_metadata` that usage is built from. */
export type UsageMetadataLike = {
  input_tokens?: number
  output_tokens?: number
  input_token_details?: { cache_read?: number; cache_creation?: number }
}

/**
 * Token usage of one model call from LangChain's `usage_metadata`. Its `input_tokens` includes cache reads and cache
 * writes, so they are taken out of `input` to count every token once.
 */
export const tokenUsageFromMetadata = (metadata: UsageMetadataLike | undefined): TokenUsage => {
  const cachedInput = metadata?.input_token_details?.cache_read ?? 0
  const cacheWrite = metadata?.input_token_details?.cache_creation ?? 0
  return {
    input: Math.max(0, (metadata?.input_tokens ?? 0) - cachedInput - cacheWrite),
    cachedInput,
    cacheWrite,
    output: metadata?.output_tokens ?? 0,
  }
}
