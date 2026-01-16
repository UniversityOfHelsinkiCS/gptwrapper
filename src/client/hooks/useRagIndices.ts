import { useQuery } from '@tanstack/react-query'
import type { RagIndexAttributes } from '../../shared/types'
import apiClient from '../util/apiClient'

export const useRagIndices = (includeExtras?: boolean) => {
  const { data: ragIndices, ...rest } = useQuery<RagIndexAttributes[]>({
    queryKey: ['ragIndices'],
    queryFn: async () => {
      const response = await apiClient.get(`/rag/indices`, {
        params: {
          includeExtras: includeExtras ? includeExtras : false,
        },
      })
      return response.data
    },
  })

  return { ragIndices, ...rest }
}

export const useCourseRagIndices = (chatInstanceId?: string, includeExtras?: boolean) => {
  const { data: ragIndices, ...rest } = useQuery<RagIndexAttributes[]>({
    enabled: !!chatInstanceId,
    queryKey: ['ragIndices', chatInstanceId],
    queryFn: async () => {
      const response = await apiClient.get(`/rag/indices`, {
        params: {
          chatInstanceId,
          includeExtras: includeExtras ? includeExtras : false,
        },
      })
      return response.data
    },
  })

  return { ragIndices: ragIndices?.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), ...rest }
}
