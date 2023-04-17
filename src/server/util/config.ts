import * as dotenv from 'dotenv'

dotenv.config()

export const PORT = process.env.PORT || 8000

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

export const DATABASE_URL = process.env.DATABASE_URL || ''
