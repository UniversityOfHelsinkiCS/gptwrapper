import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import type { TFunction } from 'i18next'

vi.mock('../../../config', async () => ({ ValidModelNameSchema: (await import('zod/v4')).z.string() }))
vi.mock('../../util/apiClient', () => ({ postAbortableStream: vi.fn() }))
vi.mock('../../hooks/apiHooks', () => ({ useGetQuery: vi.fn() }))
vi.mock('../../util/email', () => ({ sendEmail: vi.fn() }))
vi.mock('../../util/saveFile', () => ({ saveFileWithDialog: vi.fn() }))

import { formatEmail, formatMessagesAsPlainText, formatMessagesAsText } from './api'
import { oldFormatMessages } from './__fixtures__/oldFormatMessages'
import { migrateMessages } from './messages'

const t = ((key: string) => key) as unknown as TFunction
// The snapshots were recorded from the formatters before assistant messages had `parts`,
// with the old-format fixture as input. Now the same fixture goes in migrated to `parts`.
const messages = migrateMessages(oldFormatMessages)

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 10, 12, 0, 0))
})
afterAll(() => {
  vi.useRealTimers()
})

describe('conversation export output', () => {
  test('markdown download', () => {
    expect(formatMessagesAsText(messages, t)).toMatchSnapshot()
  })
  test('plain text download', () => {
    expect(formatMessagesAsPlainText(messages, t)).toMatchSnapshot()
  })
  test('email', () => {
    expect(formatEmail(messages, t)).toMatchSnapshot()
  })
})

describe('reasoning in exports', () => {
  test('is left out of the download and the email', () => {
    const withReasoning = [
      { role: 'user' as const, content: 'think' },
      {
        role: 'assistant' as const,
        parts: [
          { type: 'reasoning' as const, text: 'SECRET REASONING', durationMs: 1000 },
          { type: 'text' as const, text: 'The answer.' },
        ],
      },
    ]

    for (const output of [formatMessagesAsText(withReasoning, t), formatMessagesAsPlainText(withReasoning, t), formatEmail(withReasoning, t)]) {
      expect(output).toContain('The answer.')
      expect(output).not.toContain('SECRET REASONING')
    }
  })
})
