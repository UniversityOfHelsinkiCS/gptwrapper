import * as dotenv from 'dotenv'

dotenv.config()

export const PORT = process.env.PORT || 3000

export const inDevelopment = process.env.NODE_ENV === 'development'

export const inStaging = process.env.REACT_APP_STAGING === 'true'

export const inProduction = !inStaging && process.env.NODE_ENV === 'production'

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

export const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING || ''
