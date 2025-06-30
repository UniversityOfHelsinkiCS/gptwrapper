import type { FileSearchResultData } from '../../../shared/types'
import { useGetQuery } from '../../hooks/apiHooks'

export const useFileSearchResults = (fileSearchId: string) => {
  return useGetQuery<FileSearchResultData[] | { expired: true }>({
    queryKey: ['fileSearchResults', fileSearchId],
    url: `/ai/fileSearchResults/${fileSearchId}`,
    enabled: !!fileSearchId,
    retry: false,
  })
}
