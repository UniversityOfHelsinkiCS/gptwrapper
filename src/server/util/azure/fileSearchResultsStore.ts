import { FileSearchResultData } from '../../../shared/types'
import { User } from '../../types'
import { redisClient } from '../redis'

export const FileSearchResultsStore = {
  async saveResults(fileSearchId: string, results: FileSearchResultData[], user: User) {
    const key = `user-${user.id}:fileSearch-${fileSearchId}`
    await redisClient.set(key, JSON.stringify(results), {
      EX: 60 * 60 * 24, // 1 day expiration time
    })
  },
  async getResults(fileSearchId: string, user: User): Promise<FileSearchResultData[] | null> {
    const key = `user-${user.id}:fileSearch-${fileSearchId}`
    const results = (await redisClient.get(key)) as string
    return results ? JSON.parse(results) : null
  },
}
