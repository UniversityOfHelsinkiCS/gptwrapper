// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { ModelUsage } from '@shared/usage'

const transaction = { id: 'tx' }

vi.mock('../../db/connection', () => ({
  sequelize: { transaction: vi.fn(async (run: (t: unknown) => Promise<unknown>) => run(transaction)) },
}))

vi.mock('../../db/models', () => ({
  User: { findByPk: vi.fn() },
  UserChatInstanceUsage: { findByPk: vi.fn() },
}))

import { sequelize } from '../../db/connection'
import { User, UserChatInstanceUsage } from '../../db/models'
import { recordModelUsage } from './modelUsage'

const tokens = (input: number, cachedInput: number, cacheWrite: number, output: number) => ({ input, cachedInput, cacheWrite, output })

/** A stored row whose `update` writes back to it, like a saved Sequelize instance. */
const row = (weeklyModelUsage: ModelUsage = {}, totalModelUsage: ModelUsage = {}) => {
  const stored = {
    weeklyModelUsage,
    totalModelUsage,
    update: vi.fn(async (values: { weeklyModelUsage: ModelUsage; totalModelUsage: ModelUsage }) => {
      Object.assign(stored, values)
    }),
  }
  return stored
}

describe('recordModelUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("merges the run's usage into the user's weekly and total usage under a row lock", async () => {
    const user = row({ 'gpt-6-luna': tokens(1, 1, 1, 1) }, { 'gpt-6-luna': tokens(10, 10, 10, 10), 'gpt-4o': tokens(5, 0, 0, 5) })
    vi.mocked(User.findByPk).mockResolvedValue(user as any)

    await recordModelUsage({ userId: 'u1', usage: { 'gpt-6-luna': tokens(100, 20, 5, 30), 'Qwen3.5': tokens(1000, 0, 0, 100) } })

    expect(sequelize.transaction).toHaveBeenCalledTimes(1)
    expect(User.findByPk).toHaveBeenCalledWith('u1', expect.objectContaining({ lock: true, transaction }))
    expect(user.update).toHaveBeenCalledWith(expect.anything(), { transaction })
    expect(user.weeklyModelUsage).toEqual({ 'gpt-6-luna': tokens(101, 21, 6, 31), 'Qwen3.5': tokens(1000, 0, 0, 100) })
    expect(user.totalModelUsage).toEqual({ 'gpt-6-luna': tokens(110, 30, 15, 40), 'gpt-4o': tokens(5, 0, 0, 5), 'Qwen3.5': tokens(1000, 0, 0, 100) })
  })

  test("a course run also updates the user's usage row of the course, locked in the same transaction", async () => {
    const user = row()
    const courseUsage = row({ 'gpt-4o': tokens(1, 0, 0, 1) }, { 'gpt-4o': tokens(2, 0, 0, 2) })
    vi.mocked(User.findByPk).mockResolvedValue(user as any)
    vi.mocked(UserChatInstanceUsage.findByPk).mockResolvedValue(courseUsage as any)

    await recordModelUsage({ userId: 'u1', courseUsageId: 'usage-1', usage: { 'gpt-4o': tokens(10, 0, 0, 10) } })

    expect(UserChatInstanceUsage.findByPk).toHaveBeenCalledWith('usage-1', expect.objectContaining({ lock: true, transaction }))
    expect(courseUsage.update).toHaveBeenCalledWith(expect.anything(), { transaction })
    expect(courseUsage.weeklyModelUsage).toEqual({ 'gpt-4o': tokens(11, 0, 0, 11) })
    expect(courseUsage.totalModelUsage).toEqual({ 'gpt-4o': tokens(12, 0, 0, 12) })
    expect(user.weeklyModelUsage).toEqual({ 'gpt-4o': tokens(10, 0, 0, 10) })
  })

  test('a general chat run does not touch course usage rows', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(row() as any)

    await recordModelUsage({ userId: 'u1', courseUsageId: undefined, usage: { 'gpt-4o': tokens(1, 0, 0, 1) } })

    expect(UserChatInstanceUsage.findByPk).not.toHaveBeenCalled()
  })

  test('two charges of the same user both land, each reading the row under the lock', async () => {
    const user = row()
    vi.mocked(User.findByPk).mockResolvedValue(user as any)

    await Promise.all([
      recordModelUsage({ userId: 'u1', usage: { 'gpt-4o': tokens(1, 0, 0, 1) } }),
      recordModelUsage({ userId: 'u1', usage: { 'gpt-4o': tokens(2, 0, 0, 2) } }),
    ])

    expect(User.findByPk).toHaveBeenCalledTimes(2)
    expect(vi.mocked(User.findByPk).mock.calls.every(([, options]) => options?.lock === true)).toBe(true)
    expect(user.weeklyModelUsage).toEqual({ 'gpt-4o': tokens(3, 0, 0, 3) })
    expect(user.totalModelUsage).toEqual({ 'gpt-4o': tokens(3, 0, 0, 3) })
  })

  test('does nothing for a run without usage', async () => {
    await recordModelUsage({ userId: 'u1', courseUsageId: 'usage-1', usage: {} })

    expect(sequelize.transaction).not.toHaveBeenCalled()
  })

  test('fails when the user is missing', async () => {
    vi.mocked(User.findByPk).mockResolvedValue(null)

    await expect(recordModelUsage({ userId: 'gone', usage: { 'gpt-4o': tokens(1, 0, 0, 1) } })).rejects.toThrow('User gone not found')
  })
})
