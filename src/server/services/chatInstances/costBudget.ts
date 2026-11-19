import { type CostUserStatus, usageCost, type UserBudget } from '@shared/usage'
import type { User as UserType } from '@shared/user'
import { User } from '../../db/models'
import { ApplicationError } from '../../util/ApplicationError'
import { nextUsageReset } from '../../util/usageReset'
import { getUserBudget } from './usage'

/** The user's cost this week in €, from the stored weekly usage by model and the current config prices. */
export const getWeeklyCost = async (userId: string): Promise<number> => {
  const user = await User.findByPk(userId, { attributes: ['id', 'weeklyModelUsage'] })
  if (!user) throw ApplicationError.NotFound('User not found')
  return usageCost(user.weeklyModelUsage ?? {})
}

export type BudgetUsage = { cost: number; budget: UserBudget }

/** The user's weekly cost and budget. */
export const getBudgetUsage = async (user: UserType): Promise<BudgetUsage> => {
  const [cost, budget] = await Promise.all([getWeeklyCost(user.id), getUserBudget(user)])
  return { cost, budget }
}

/** At or over 100% of the budget. Admins are not exempted here: callers bypass for them. */
export const isBudgetExhausted = ({ cost, budget }: BudgetUsage): boolean => cost >= budget.limit

/** User status under `USAGE_ENFORCEMENT=cost`: the same in every chat, course or not. */
export const getCostUserStatus = async (user: UserType, now: Date = new Date()): Promise<CostUserStatus> => {
  const { cost, budget } = await getBudgetUsage(user)
  return { mode: 'cost', usage: cost, limit: budget.limit, budget, resetsAt: nextUsageReset(now).toISOString() }
}
