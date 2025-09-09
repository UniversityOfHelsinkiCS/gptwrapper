import { useMutation } from '@tanstack/react-query'

import queryClient from '../util/queryClient'
import { queryKey } from './usePrompts'
import apiClient from '../util/apiClient'
import type { PromptEditableParams, PromptCreationParams } from '@shared/prompt'

export const useCreatePromptMutation = () => {
  const mutationFn = async (data: Omit<PromptCreationParams, 'userId'>) => {
    const res = await apiClient.post(`/prompts`, data)

    const prompt = res.data

    return prompt
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey,
      }),
  })

  return mutation
}

export const useDeletePromptMutation = () => {
  const mutationFn = async (id: string) => {
    const res = await apiClient.delete(`/prompts/${id}`)

    return res
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey,
      }),
  })

  return mutation
}

export const useEditPromptMutation = () => {
  const mutationFn = async (data: PromptEditableParams & { id: string }) => {
    const res = await apiClient.put(`/prompts/${data.id}`, data)
    const prompt = res.data
    return prompt
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey,
      }),
  })

  return mutation
}
