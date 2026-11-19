// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../../db/models', () => ({ User: { findByPk: vi.fn() } }))
vi.mock('./usage', () => ({ getUserBudget: vi.fn() }))

import { getModelPrice } from '@config'
import type { User as UserType } from '@shared/user'
import { User } from '../../db/models'
import { getCostUserStatus, isBudgetExhausted } from './costBudget'
import { getUserBudget } from './usage'

const user = { id: 'u1', isAdmin: false } as unknown as UserType
const budget = { limit: 5, base: 2.5, bonuses: [{ courseId: 'otm-1', name: { fi: 'Kurssi', en: 'Course', sv: 'Kurs' }, percent: 100 }] }

describe('isBudgetExhausted', () => {
  test('is reached at 100% of the budget limit', () => {
    expect(isBudgetExhausted({ cost: 4.99, budget })).toBe(false)
    expect(isBudgetExhausted({ cost: 5, budget })).toBe(true)
    expect(isBudgetExhausted({ cost: 6, budget })).toBe(true)
  })
})

describe('getCostUserStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUserBudget).mockResolvedValue(budget)
  })

  test("returns the weekly cost of the user's model usage, the budget and the next reset", async () => {
    vi.mocked(User.findByPk).mockResolvedValue({ weeklyModelUsage: { 'gpt-6-luna': { input: 1_000_000, cachedInput: 0, cacheWrite: 0, output: 0 } } } as any)

    const status = await getCostUserStatus(user, new Date(2026, 10, 19, 12, 0))

    expect(status).toEqual({
      mode: 'cost',
      usage: getModelPrice('gpt-6-luna')!.input,
      limit: 5,
      budget,
      resetsAt: new Date(2026, 10, 23, 0, 1).toISOString(),
    })
    expect(User.findByPk).toHaveBeenCalledWith('u1', expect.anything())
  })

  test('is zero without usage this week', async () => {
    vi.mocked(User.findByPk).mockResolvedValue({ weeklyModelUsage: {} } as any)

    expect((await getCostUserStatus(user)).usage).toBe(0)
  })
})
