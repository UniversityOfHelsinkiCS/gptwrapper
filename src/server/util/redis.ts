import { createClient } from 'redis'

import { REDIS_HOST } from './config'

const redisUrl = `redis://${REDIS_HOST}:6379`

export const redisClient = createClient({
  url: redisUrl,
})

await redisClient.connect().catch((err) => {
  console.error('Redis connection error:', err)
})

export const set = async (key: string, value: any) => {
  const ttl = 60 * 60
  await redisClient.set(key, JSON.stringify(value), { EX: ttl })
}

export const get = async (key: string): Promise<any | null> => {
  const value = await redisClient.get(key)

  if (!value || typeof value !== 'string') return null

  return JSON.parse(value)
}
