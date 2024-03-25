import { useMutation } from '@tanstack/react-query'

import { Message } from '../types'
import { PUBLIC_URL } from '../../config'
import queryClient from '../util/queryClient'
import { queryKey } from './usePrompts'

interface NewPromptData {
  chatInstanceId: string
  name: string
  systemMessage: string
  messages: Message[]
  hidden: boolean
}

export const useCreatePromptMutation = () => {
  const mutationFn = async (data: NewPromptData) => {
    const res = await fetch(`${PUBLIC_URL}/api/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const prompt = await res.json()

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
    const res = await fetch(`${PUBLIC_URL}/api/prompts/${id}`, {
      method: 'DELETE',
    })

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
