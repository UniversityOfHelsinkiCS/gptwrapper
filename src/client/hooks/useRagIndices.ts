import { useQuery } from '@tanstack/react-query'
import apiClient from '../util/apiClient'
import { RagIndexAttributes } from '../../shared/types'

export const useRagIndices = (courseId: string | null, includeExtras?: boolean) => {
  const { data: ragIndices, ...rest } = useQuery<RagIndexAttributes[]>({
    queryKey: courseId ? ['ragIndices', courseId] : ['ragIndices'],
    queryFn: async () => {
      const response = await apiClient.get(`/rag/indices`, {
        params: {
          courseId: courseId ? courseId : undefined,
          includeExtras: includeExtras ? includeExtras : false,
        },
      })
      return response.data
    },
  })

  return { ragIndices, ...rest }
}
