// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

// usage.ts pulls in the Sequelize models; only the token counting is needed here.
vi.mock('../chatInstances/usage', () => ({
  calculateUsage: (messages: Message[], encoding: { encode: (text: string) => unknown[] }) =>
    messages.reduce((sum, message) => sum + encoding.encode(String(message.content)).length, 0),
}))
import { inputLimit, validModels } from '@config'
import type { Message } from '@shared/chat'
import { handleWarnings } from '../agent/prepareMessages'
import { truncateMessages } from './truncateMessages'

const mock = validModels.find((model) => model.name === 'mock')!

// Each 'a ' is one token in the tiktoken encodings used here.
const messageOfTokens = (tokens: number, role: Message['role'] = 'user'): Message => ({ role, content: 'a '.repeat(tokens).trim() }) as Message

describe('inputLimit', () => {
  it('reserves the output limit from the context window', () => {
    expect(inputLimit({ context: 400_000, outputLimit: 128_000 })).toBe(272_000)
  })

  it('is positive for every configured model', () => {
    for (const model of validModels) expect(inputLimit(model)).toBeGreaterThan(0)
  })
})

describe('truncateMessages', () => {
  it('keeps the newest messages that fit in the input limit, not the whole context window', () => {
    const limit = inputLimit(mock)
    const older = messageOfTokens(limit / 2)
    const newer = messageOfTokens(limit / 2 + 10)

    const result = truncateMessages(mock, [older, newer])

    expect(result).toEqual([newer])
  })
})

describe('handleWarnings', () => {
  it('warns when the conversation exceeds the input limit', () => {
    const { warnings } = handleWarnings(mock, [messageOfTokens(inputLimit(mock) + 50)])

    const warning = warnings.find((w) => w.warningType === 'contextLimit')
    expect(warning && 'contextLimit' in warning ? warning.contextLimit : undefined).toBe(inputLimit(mock))
  })

  it('does not warn when the conversation fits the input limit', () => {
    const { warnings } = handleWarnings(mock, [messageOfTokens(inputLimit(mock) / 2)])

    expect(warnings.some((w) => w.warningType === 'contextLimit')).toBe(false)
  })
})
