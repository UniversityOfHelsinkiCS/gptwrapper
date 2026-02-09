import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient from '../../util/apiClient'
import { RagFileAttributes, RagIndexAttributes, RagIndexMetadata } from '../../../shared/types'
import { IngestionJobStatus } from '@shared/ingestion'
import queryClient from '../../util/queryClient'

export const useCreateRagIndexMutation = () => {
  const mutation = useMutation({
    mutationFn: async ({ chatInstanceId, name, language }: RagIndexMetadata & { chatInstanceId: string }) => {
      const response = await apiClient.post('/rag/indices', {
        name,
        chatInstanceId,
        language,
      })
      return response.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ragIndices'] })
    },
  })
  return mutation
}

export type RagIndexDetails = Omit<RagIndexAttributes, 'ragFileCount'> & {
  ragFiles: RagFileAttributes[]
}

export const useRagIndexDetails = (indexId: number | null) => {
  return useQuery<RagIndexDetails>({
    queryKey: ['ragIndex', indexId],
    queryFn: async () => {
      const response = await apiClient.get(`/rag/indices/${indexId}`)
      return response.data
    },
    enabled: !!indexId,
  })
}

export const useRagIndexJobs = (indexId: number | null, refetchInterval: number) => {
  return useQuery<IngestionJobStatus[]>({
    queryKey: ['ragIndex', indexId, 'jobs'],
    queryFn: async () => {
      const response = await apiClient.get(`/rag/indices/${indexId}/jobs`)
      return response.data
    },
    enabled: !!indexId,
    refetchInterval,
  })
}

export const useDeleteRagIndexMutation = (indexId: number) => {
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/rag/indices/${indexId}`)
      return response.data
    },
    onSuccess: (_data: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['ragIndices'] })
    },
  })
  return mutation
}

export const useUpdateRagIndexMutation = (indexId: number) => {
  const mutation = useMutation({
    mutationFn: async (data: Partial<RagIndexAttributes>) => {
      const response = await apiClient.put(`/rag/indices/${indexId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ragIndices'] })
      queryClient.invalidateQueries({ queryKey: ['ragIndex', indexId] })
    },
  })
  return mutation
}

export const useUploadMutation = ({ index, onUploadProgress = () => {} }: { index?: RagIndexAttributes; onUploadProgress?: (progress: number) => void }) => {
  const mutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!index) {
        throw new Error('Index is required')
      }
      const formData = new FormData()
      // Append each file individually
      files.forEach((file) => {
        formData.append('files', file)
      })

      const res = await apiClient.post(`/rag/indices/${index.id}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 1
          const current = progressEvent.loaded
          const percentCompleted = Math.round((current / total) * 100)
          onUploadProgress(percentCompleted)
        },
      })

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

export const useDeleteRagFileTextMutation = () => {
  const mutation = useMutation({
    mutationFn: async ({ indexId, fileId }: { indexId: number; fileId: number }) => {
      const response = await apiClient.delete(`/rag/indices/${indexId}/files/${fileId}/text`)
      return response.data
    },
  })
  return mutation
}
