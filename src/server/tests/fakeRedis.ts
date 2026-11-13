/**
 * An in-memory stand-in for `util/redis`, for tests that must not connect to Redis:
 * `vi.mock('../../util/redis', async () => (await import('../../tests/fakeRedis')).fakeRedisModule())`.
 * Only the commands the code under test uses. `store` is shared, so a test can look at or clear it.
 */
export const fakeRedisStore = new Map<string, string>()

export const fakeRedisModule = () => ({
  redisClient: {
    isReady: true,
    get: async (key: string) => fakeRedisStore.get(key) ?? null,
    set: async (key: string, value: string) => {
      fakeRedisStore.set(key, value)
      return 'OK'
    },
    del: async (key: string) => (fakeRedisStore.delete(key) ? 1 : 0),
  },
})
