import type { FileSearchResultData } from '../../../shared/types'
import { useGetQuery } from '../../hooks/apiHooks'

export const useFileSearchResults = (fileSearchId: string) => {
  const { data, ...rest } = useGetQuery<FileSearchResultData[]>({
    queryKey: ['fileSearchResults', fileSearchId],
    url: `/ai/fileSearchResults/${fileSearchId}`,
    enabled: !!fileSearchId,
    retry: false,
  })

  return { results: data, ...rest }
}
