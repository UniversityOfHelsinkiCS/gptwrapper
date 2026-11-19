// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { assertModelPrices, getModelPrice, type ModelConfig, ModelProvider, models, validModels } from '@config'
import { blendedPrice, mergeUsage, modelPriceIndicator, priceDots, priceMultiplier, roundPriceMultiplier, tokenUsageFromMetadata, usageCost } from './usage'

const tokens = (input: number, cachedInput: number, cacheWrite: number, output: number) => ({ input, cachedInput, cacheWrite, output })

describe('mergeUsage', () => {
  it('adds token types per model and keeps models found on one side only', () => {
    const merged = mergeUsage(
      { 'gpt-6-luna': tokens(1, 2, 3, 4), 'gpt-5.5': tokens(1, 1, 1, 1) },
      { 'gpt-6-luna': tokens(10, 20, 30, 40), 'Qwen3.5': tokens(5, 0, 0, 5) },
    )

    expect(merged).toEqual({
      'gpt-6-luna': tokens(11, 22, 33, 44),
      'gpt-5.5': tokens(1, 1, 1, 1),
      'Qwen3.5': tokens(5, 0, 0, 5),
    })
  })

  it('treats missing token types as 0', () => {
    const partial = { 'gpt-6-luna': { input: 7 } } as unknown as Parameters<typeof mergeUsage>[0]

    expect(mergeUsage(partial, {})).toEqual({ 'gpt-6-luna': tokens(7, 0, 0, 0) })
  })

  it('does not change its arguments', () => {
    const a = { 'gpt-6-luna': tokens(1, 1, 1, 1) }
    mergeUsage(a, { 'gpt-6-luna': tokens(1, 1, 1, 1) })

    expect(a).toEqual({ 'gpt-6-luna': tokens(1, 1, 1, 1) })
  })
})

describe('usageCost', () => {
  it('prices each token type per 1M tokens', () => {
    // Luna: input 0.108, cached 0.011, cache write 0.135, output 0.539
    expect(usageCost({ 'gpt-6-luna': tokens(1_000_000, 1_000_000, 1_000_000, 1_000_000) })).toBeCloseTo(0.108 + 0.011 + 0.135 + 0.539)
  })

  it('sums over models', () => {
    expect(usageCost({ 'gpt-6-luna': tokens(1_000_000, 0, 0, 0), 'gpt-6.1-sol': tokens(0, 0, 0, 1_000_000) })).toBeCloseTo(0.108 + 10.78)
  })

  it('charges cache writes at the input price when the model has no cache write price', () => {
    expect(getModelPrice('gpt-5.1')?.cacheWrite).toBeUndefined()
    expect(usageCost({ 'gpt-5.1': tokens(0, 0, 1_000_000, 0) })).toBeCloseTo(1.24)
  })

  it('still prices a disabled model', () => {
    const disabled = models.find((model) => !model.enabled)
    if (!disabled) return // every model is enabled at the moment

    expect(validModels.some((model) => model.name === disabled.name)).toBe(false)
    expect(usageCost({ [disabled.name]: tokens(1_000_000, 0, 0, 0) })).toBeCloseTo(disabled.price.input)
  })

  it('charges a model missing from the config at the highest input price, never for free', () => {
    const highestInput = Math.max(...models.map((model) => model.price.input))

    expect(usageCost({ 'removed-model': tokens(1_000_000, 0, 0, 0) })).toBeCloseTo(highestInput)
  })

  it('is 0 for no usage', () => {
    expect(usageCost({})).toBe(0)
  })
})

describe('model config', () => {
  const model = (price: ModelConfig['price'], name = 'some-model'): ModelConfig => ({
    name,
    enabled: true,
    price,
    displayName: name,
    context: 1000,
    outputLimit: 100,
    provider: ModelProvider.Azure,
    tags: [],
  })

  it('accepts the configured prices', () => {
    expect(() => assertModelPrices(models)).not.toThrow()
  })

  it('rejects a model other than the mock without a price', () => {
    expect(() => assertModelPrices([model({ input: 0, cachedInput: 0, output: 0 })])).toThrow('some-model has no price')
    expect(() => assertModelPrices([model({ input: 0, cachedInput: 0, output: 0 }, 'mock')])).not.toThrow()
  })

  it('rejects negative and non-numeric prices', () => {
    expect(() => assertModelPrices([model({ input: -1, cachedInput: 0, output: 1 })])).toThrow('invalid price')
    expect(() => assertModelPrices([model({ input: Number.NaN, cachedInput: 0, output: 1 })])).toThrow('invalid price')
  })

  it('hides internal models from selection but keeps them valid', () => {
    const qwen = validModels.find((m) => m.name === 'Qwen3.5')

    expect(qwen?.tags).toContain('internal')
  })
})

describe('tokenUsageFromMetadata', () => {
  it('takes cache reads and cache writes out of the input tokens, so each token is counted once', () => {
    expect(tokenUsageFromMetadata({ input_tokens: 1000, output_tokens: 40, input_token_details: { cache_read: 700, cache_creation: 200 } })).toEqual(
      tokens(100, 700, 200, 40),
    )
  })

  it('counts all input as uncached without cache details', () => {
    expect(tokenUsageFromMetadata({ input_tokens: 12, output_tokens: 3 })).toEqual(tokens(12, 0, 0, 3))
  })

  it('is empty without metadata and never negative', () => {
    expect(tokenUsageFromMetadata(undefined)).toEqual(tokens(0, 0, 0, 0))
    expect(tokenUsageFromMetadata({ input_tokens: 5, input_token_details: { cache_read: 10 } })).toEqual(tokens(0, 10, 0, 0))
  })
})

describe('price indicator', () => {
  it('blends input, cached input and output prices 1 : 2 : 1', () => {
    expect(blendedPrice({ input: 4, cachedInput: 2, output: 8 })).toBe(4)
  })

  it('compares configured models with GPT-6 Luna', () => {
    expect(modelPriceIndicator('gpt-6-luna')).toEqual({ multiplier: 1, dots: 1 })
    expect(modelPriceIndicator('gpt-5-mini')).toEqual({ multiplier: 3, dots: 2 })
    expect(modelPriceIndicator('gpt-6.1-terra')).toEqual({ multiplier: 10, dots: 2 })
    expect(modelPriceIndicator('gpt-5.1')).toEqual({ multiplier: 17, dots: 3 })
    expect(modelPriceIndicator('gpt-6.1-sol')).toEqual({ multiplier: 20, dots: 3 })
    expect(modelPriceIndicator('gemma-4-26B-A4B')).toEqual({ multiplier: 0.5, dots: 1 })
  })

  it('shows nothing for the mock or an unknown model', () => {
    expect(modelPriceIndicator('mock')).toBeUndefined()
    expect(modelPriceIndicator('no-such-model')).toBeUndefined()
  })

  it('rounds to a whole number from 1 up and to one decimal below 1', () => {
    expect(roundPriceMultiplier(16.4)).toBe(16)
    expect(roundPriceMultiplier(1.49)).toBe(1)
    expect(roundPriceMultiplier(0.96)).toBe(1)
    expect(roundPriceMultiplier(0.44)).toBe(0.4)
  })

  it('buckets the multiplier into dots: 1 up to 2×, 2 up to 10×, 3 up to 25×, 4 above', () => {
    expect([0.4, 2, 3, 10, 11, 25, 26].map(priceDots)).toEqual([1, 1, 2, 2, 3, 3, 4])
  })

  it('reaches four dots with a price far above Luna', () => {
    const multiplier = priceMultiplier({ input: 5, cachedInput: 0.5, output: 25 })
    expect(multiplier).toBe(46)
    expect(priceDots(multiplier)).toBe(4)
  })
})
