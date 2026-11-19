import z from 'zod/v4'

/** Largest course token limit (ChatInstance.usageLimit is a Postgres INTEGER) */
export const MAX_TOKEN_LIMIT = 2_147_483_647

/** Weekly course chat token limit per user, set by admins */
export const TokenLimitSchema = z.number().int().positive().max(MAX_TOKEN_LIMIT)

/** Largest course budget bonus in percent (100× the base budget) */
export const MAX_BUDGET_BONUS_PERCENT = 10_000

/** Course budget bonus in percent of the base weekly budget, set by admins. null = no bonus */
export const BudgetBonusPercentSchema = z.number().int().nonnegative().max(MAX_BUDGET_BONUS_PERCENT).nullable()
