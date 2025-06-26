import * as redis from './redis'

let lastRestart: number | null = null

export const updateLastRestart = async () => {
  const now = Date.now()
  lastRestart = now
  await redis.set('LAST_RESTART', now)
}

export const getLastRestart = async () => {
  const str = (await redis.get('LAST_RESTART')) ?? lastRestart
  const int = Number(str)
  return new Date(int)
}
