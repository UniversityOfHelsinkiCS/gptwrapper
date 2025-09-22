import { createClient } from 'redis'

import { REDIS_HOST } from './config'

const redisUrl = `redis://${REDIS_HOST}:6379`

export const redisClient = createClient({
  url: redisUrl,
})

await redisClient.connect().catch((err) => {
  console.error('Redis connection error:', err)
})

redisClient.on('error', (err) => console.error('Redis Client Error', err))

export const set = async (key: string, value: any) => {
  const ttl = 60 * 60
  await redisClient.set(key, JSON.stringify(value), { EX: ttl })
}

export const get = async (key: string): Promise<any | null> => {
  const value = await redisClient.get(key)

  if (!value || typeof value !== 'string') return null

  return JSON.parse(value)
}

export async function countKeysMatchingPattern(pattern: string) {
  let cursor = '0'
  let count = 0

  do {
    const result = await redisClient.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    })

    cursor = result.cursor as string
    count += result.keys.length
  } while (cursor !== '0')

  return count
}
