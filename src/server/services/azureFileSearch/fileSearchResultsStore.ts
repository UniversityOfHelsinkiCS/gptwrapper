import type { FileSearchResultData } from '../../../shared/types'
import type { User } from '../../../shared/user'
import { redisClient } from '../../util/redis'

export const FileSearchResultsStore = {
  getKey(user: User, fileSearchId: string): string {
    return `user-${user.id}:fileSearch-${fileSearchId}`
  },

  async saveResults(fileSearchId: string, results: FileSearchResultData[], user: User) {
    const key = this.getKey(user, fileSearchId)
    await redisClient.set(key, JSON.stringify(results), {
      EX: 60 * 60 * 24 * 365, // 365 day expiration time
    })
  },
  async getResults(fileSearchId: string, user: User): Promise<FileSearchResultData[] | null> {
    const key = this.getKey(user, fileSearchId)
    const results = (await redisClient.get(key)) as string
    return results ? JSON.parse(results) : null
  },
}
