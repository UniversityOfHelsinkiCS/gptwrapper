// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { assertModelPrices, getModelPrice, type ModelConfig, ModelProvider, models, validModels } from '@config'
import { mergeUsage, usageCost } from './usage'

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
