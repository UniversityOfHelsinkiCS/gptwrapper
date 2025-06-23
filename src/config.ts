export const inDevelopment = process.env.NODE_ENV === 'development'

export const inStaging = process.env.STAGING === 'true'

export const inProduction = !inStaging && process.env.NODE_ENV === 'production'

export const inCI = process.env.CI === 'true'

export const GIT_SHA = process.env.REACT_APP_GIT_SHA || ''

export const PUBLIC_URL = process.env.PUBLIC_URL || ''

export const RAG_ENABLED = process.env.RAG_ENABLED === 'true'

export const DEFAULT_TOKEN_LIMIT = Number(process.env.DEFAULT_TOKEN_LIMIT) || 150_000

export const FREE_MODEL = process.env.FREE_MODEL || 'gpt-4o-mini' // as it was decided in 23th Sept 2024 meeting
export const DEFAULT_MODEL = process.env.DEFAUL_MODEL || 'gpt-4o-mini'
export const DEFAUL_CONTEXT_LIMIT = Number(process.env.DEFAUL_CONTEXT_LIMIT) || 4_096

export const DEFAULT_RESET_CRON = process.env.DEFAULT_RESET_CRON || '0 0 1 */3 *'

export const EMBED_MODEL = process.env.EMBED_MODEL ?? 'text-embedding-small'
export const EMBED_DIM = process.env.EMBED_DIM ? Number(process.env.EMBED_DIM) : 1024

export const validModels = [
  {
    name: 'gpt-4',
    deployment: process.env.GPT_4 || 'curredev4',
    context: 128_000,
  },
  {
    name: 'gpt-4o',
    deployment: process.env.GPT_4O || '',
    context: 128_000,
  },
  {
    name: 'gpt-4o-mini',
    deployment: process.env.GPT_4O_MINI || '',
    context: 128_000,
  },
  {
    name: 'gpt-4.1',
    deployment: process.env.GPT_41 || '',
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
      ],
)

console.log(`Valid models: ${JSON.stringify(validModels, null, 2)}`)

export const DEFAULT_MODEL_ON_ENABLE = 'gpt-4o'

export const DEFAULT_ASSISTANT_INSTRUCTIONS = 'Olet avulias avustaja'
export const DEFAULT_MODEL_TEMPERATURE = 0.5
export const ALLOWED_FILE_TYPES = ['text/plain', 'text/html', 'text/css', 'text/csv', 'text/markdown', 'text/md', 'application/pdf']
