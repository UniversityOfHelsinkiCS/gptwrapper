import { useQuery } from '@tanstack/react-query'
import apiClient from '../util/apiClient'
import { RagIndexAttributes } from '../../shared/types'

export const useRagIndex = (ragIndexId: number) => {
  return useQuery<RagIndexAttributes>({
    queryKey: ['ragIndices', ragIndexId],
    queryFn: async () => {
      const response = await apiClient.get(`/rag/indices/${ragIndexId}`)
      return response.data
    },
  })
}
