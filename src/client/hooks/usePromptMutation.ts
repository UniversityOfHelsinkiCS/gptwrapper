import { useMutation } from '@tanstack/react-query'

import { Message } from '../types'
import queryClient from '../util/queryClient'
import { queryKey } from './usePrompts'
import apiClient from '../util/apiClient'

interface NewPromptData {
  chatInstanceId: string
  name: string
  systemMessage: string
  messages: Message[]
  hidden: boolean
}

export const useCreatePromptMutation = () => {
  const mutationFn = async (data: NewPromptData) => {
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
