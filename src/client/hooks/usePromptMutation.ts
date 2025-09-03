import { useMutation } from '@tanstack/react-query'

import { Message, Prompt } from '../types'
import queryClient from '../util/queryClient'
import { queryKey } from './usePrompts'
import apiClient from '../util/apiClient'

interface NewPromptData {
  chatInstanceId: string
  type: 'CHAT_INSTANCE' | 'PERSONAL' | 'RAG_INDEX'
  name: string
  systemMessage: string
  messages: Message[]
  hidden: boolean
  mandatory: boolean
  ragIndexId: number | undefined
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

export const useEditPromptMutation = () => {
  const mutationFn = async (data: Prompt) => {
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
