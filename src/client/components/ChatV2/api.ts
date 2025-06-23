import { useQuery } from '@tanstack/react-query'
import type { FileSearchResultData } from '../../../shared/types'
import apiClient from '../../util/apiClient'

export const useFileSearchResults = (fileSearchId: string) => {
  const { data, ...rest } = useQuery<FileSearchResultData[]>({
    queryKey: ['fileSearchResults', fileSearchId],
    queryFn: async () => {
      const res = await apiClient.get(`/ai/fileSearchResults/${fileSearchId}`)
      return res.data
    },
    enabled: !!fileSearchId,
  })

  return { results: data, ...rest }
}
