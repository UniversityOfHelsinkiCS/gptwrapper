import { useQuery } from '@tanstack/react-query'
import type { RagIndexAttributes } from '../../shared/types'
import apiClient from '../util/apiClient'

export const useRagIndices = (chatInstanceId?: string, includeExtras?: boolean) => {
  const { data: ragIndices, ...rest } = useQuery<RagIndexAttributes[]>({
    queryKey: chatInstanceId ? ['ragIndices', chatInstanceId] : ['ragIndices'],
    queryFn: async () => {
      const response = await apiClient.get(`/rag/indices`, {
        params: {
          chatInstanceId: chatInstanceId ? chatInstanceId : undefined,
          includeExtras: includeExtras ? includeExtras : false,
        },
      })
      return response.data
    },
  })

  return { ragIndices, ...rest }
}
