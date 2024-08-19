export const inDevelopment = process.env.NODE_ENV === 'development'

export const inStaging = process.env.STAGING === 'true'

export const inProduction = !inStaging && process.env.NODE_ENV === 'production'

export const inCI = process.env.CI === 'true'

export const GIT_SHA = process.env.REACT_APP_GIT_SHA || ''

export const PUBLIC_URL = process.env.PUBLIC_URL || ''

export const UPDATER_CRON_ENABLED = process.env.UPDATER_CRON_ENABLED === 'true'

export const DEFAULT_TOKEN_LIMIT =
  Number(process.env.DEFAULT_TOKEN_LIMIT) || 75_000

export const DEFAULT_MODEL = process.env.DEFAUL_MODEL || 'gpt-3.5-turbo'
export const DEFAUL_CONTEXT_LIMIT =
  Number(process.env.DEFAUL_CONTEXT_LIMIT) || 4_096

export const DEFAULT_RESET_CRON =
  process.env.DEFAULT_RESET_CRON || '0 0 1 */3 *'

export const validModels = [
  {
    name: 'gpt-3.5-turbo',
    deployment: process.env.GPT_35_TURBO || 'curredev35',
    context: 16_384,
  },
  {
    name: 'gpt-4',
    deployment: process.env.GPT_4 || 'curredev4',
    context: 128_000,
  },
  {
    name: 'gpt-4o',
    deployment: process.env.GPT_4o || 'gpt4o',
    context: 128_000,
  },
].concat(
  // Add mock model if not in production
  inProduction
    ? []
    : [
        {
          name: 'mock',
          deployment: 'mock',
          context: 128_000,
        },
      ]
)

export const DEFAULT_MODEL_ON_ENABLE = 'gpt-4'
