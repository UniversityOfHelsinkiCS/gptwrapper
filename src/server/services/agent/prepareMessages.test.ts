// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

// usage.ts pulls in the Sequelize models; only the token counting is needed here.
vi.mock('../chatInstances/usage', () => ({
  calculateUsage: (messages: Message[], encoding: { encode: (text: string) => unknown[] }) =>
    messages.reduce((sum, message) => sum + encoding.encode(String(message.content)).length, 0),
}))
import { isFreeModel, validModels } from '@config'
import type { Message } from '@shared/chat'
import { handleWarnings } from './prepareMessages'

const freeModel = validModels.find((model) => model.name === 'gpt-6-luna')!
const paidModel = validModels.find((model) => !isFreeModel(model.name) && model.name !== 'mock')!

// Each 'a ' is one token in the tiktoken encodings used here.
const messageOfTokens = (tokens: number): Message => ({ role: 'user', content: 'a '.repeat(tokens).trim() }) as Message

const usageWarning = (warnings: ReturnType<typeof handleWarnings>['warnings']) => warnings.find((w) => w.warningType === 'usage')

describe('handleWarnings usage warning under token enforcement', () => {
  it('warns above 10% of the token limit', () => {
    const warning = usageWarning(handleWarnings(paidModel, [messageOfTokens(2_000)], [], 10_000).warnings)

    expect(warning && 'tokenUsagePercentage' in warning ? warning.tokenUsagePercentage : undefined).toBe(20)
  })

  it('does not warn on a free model', () => {
    expect(usageWarning(handleWarnings(freeModel, [messageOfTokens(2_000)], [], 10_000).warnings)).toBeUndefined()
  })
})

describe('handleWarnings usage warning under cost enforcement', () => {
  const tokens = 10_000
  const estimatedCost = (tokens * freeModel.price.input) / 1_000_000

  it('warns when the input at the uncached input price is over 10% of the budget, also on a model free under tokens', () => {
    const budget = estimatedCost * 4

    const warning = usageWarning(handleWarnings(freeModel, [messageOfTokens(tokens)], [], { budget }).warnings)

    expect(warning && 'tokenUsagePercentage' in warning ? warning.tokenUsagePercentage : undefined).toBe(25)
  })

  it('does not warn at 10% of the budget or below', () => {
    expect(usageWarning(handleWarnings(freeModel, [messageOfTokens(tokens)], [], { budget: estimatedCost * 10 }).warnings)).toBeUndefined()
  })

  it('does not warn once the usage warning is ignored', () => {
    expect(usageWarning(handleWarnings(freeModel, [messageOfTokens(tokens)], ['usage'], { budget: estimatedCost }).warnings)).toBeUndefined()
  })
})
