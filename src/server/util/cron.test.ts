// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('node-cron', () => ({ default: { schedule: vi.fn() } }))
vi.mock('../db/models', () => ({
  User: { update: vi.fn() },
  UserChatInstanceUsage: { update: vi.fn() },
}))
vi.mock('../updater', () => ({ run: vi.fn() }))
vi.mock('./logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))

import { User, UserChatInstanceUsage } from '../db/models'
import { resetUsage } from './cron'

const updatedValues = (update: unknown) => vi.mocked(update as typeof User.update).mock.calls.map(([values]) => values)

describe('resetUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('empties the weekly usage by model of users and course usage rows, not the totals', async () => {
    await resetUsage()

    expect(updatedValues(User.update)).toContainEqual({ weeklyModelUsage: {} })
    expect(updatedValues(UserChatInstanceUsage.update)).toContainEqual({ weeklyModelUsage: {} })
    for (const values of [...updatedValues(User.update), ...updatedValues(UserChatInstanceUsage.update)]) {
      expect(values).not.toHaveProperty('totalModelUsage')
    }
  })

  test('still resets the token counters as before', async () => {
    await resetUsage()

    expect(updatedValues(User.update)).toContainEqual(expect.objectContaining({ usage: 0 }))
    expect(updatedValues(UserChatInstanceUsage.update)).toContainEqual({ usageCount: 0 })
  })
})
