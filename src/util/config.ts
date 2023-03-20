import * as dotenv from 'dotenv'

dotenv.config()

export const inDevelopment = process.env.NODE_ENV === 'development'

export const inStaging = process.env.REACT_APP_STAGING === 'true'

export const inProduction = !inStaging && process.env.NODE_ENV === 'production'

export const OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY || ''
