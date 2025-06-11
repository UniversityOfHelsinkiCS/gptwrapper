import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient from '../../util/apiClient'
import { RagFileAttributes, RagIndexAttributes } from '../../../shared/types'

export const useCreateRagIndexMutation = () => {
  const mutation = useMutation({
    mutationFn: async ({ courseId, indexName }: { courseId: string; indexName: string }) => {
      const response = await apiClient.post('/rag/indices', { name: indexName, courseId })
      return response.data
    },
  })
  return mutation
}

type RagIndexDetails = Omit<RagIndexAttributes, 'ragFileCount'> & {
  ragFiles: RagFileAttributes[]
}

export const useRagIndexDetails = (indexId: number | null) => {
  const { data, ...rest } = useQuery<RagIndexDetails>({
    queryKey: ['ragIndex', indexId],
    queryFn: async () => {
      const response = await apiClient.get(`/rag/indices/${indexId}`)
      return response.data
    },
    enabled: !!indexId,
  })

  return { data, ...rest }
}

export const useDeleteRagIndexMutation = () => {
  const mutation = useMutation({
    mutationFn: async (indexId: number) => {
      const response = await apiClient.delete(`/rag/indices/${indexId}`)
      return response.data
    },
  })
  return mutation
}

export const useUploadMutation = (index: RagIndexDetails | null) => {
  const mutation = useMutation({
    mutationFn: async (files: FileList) => {
      if (!index) {
        throw new Error('Index is required')
      }
      const formData = new FormData()
      // Append each file individually
      Array.from(files).forEach((file) => {
        formData.append('files', file)
      })

      const res = await apiClient.post(`/rag/indices/${index.id}/upload`, formData)

      return res.data
    },
  })
  return mutation
}

export const useDeleteRagFileMutation = () => {
  const mutation = useMutation({
    mutationFn: async ({ indexId, fileId }: { indexId: number; fileId: number }) => {
      const response = await apiClient.delete(`/rag/indices/${indexId}/files/${fileId}`)
      return response.data
    },
  })
  return mutation
}
