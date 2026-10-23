import { useMutation } from '@tanstack/react-query'
import type { ApiKey } from '../../../shared/apiKey'
import { useGetQuery } from '../../hooks/apiHooks'
import apiClient, { type ApiError } from '../../util/apiClient'
import queryClient from '../../util/queryClient'

const apiKeysQueryKey = ['apiKeys']
const invalidateApiKeys = () => queryClient.invalidateQueries({ queryKey: apiKeysQueryKey })

export const isConflictError = (error: unknown) => (error as ApiError)?.response?.status === 409

export const useApiKeys = (enabled: boolean) => useGetQuery<ApiKey[]>({ queryKey: apiKeysQueryKey, url: '/apikeys', enabled })

export const useCreateApiKeyMutation = () => {
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post<ApiKey>('/apikeys', { name })
      return res.data
    },
    onSuccess: invalidateApiKeys,
  })
}

export const useDeleteApiKeyMutation = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/apikeys/${id}`)
    },
    onSuccess: invalidateApiKeys,
  })
}