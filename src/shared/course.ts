import z from 'zod/v4'

/** Largest course token limit (ChatInstance.usageLimit is a Postgres INTEGER) */
export const MAX_TOKEN_LIMIT = 2_147_483_647

/** Weekly course chat token limit per user, set by admins */
export const TokenLimitSchema = z.number().int().positive().max(MAX_TOKEN_LIMIT)
