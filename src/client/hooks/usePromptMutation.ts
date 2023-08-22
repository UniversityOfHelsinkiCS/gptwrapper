import { useMutation } from '@tanstack/react-query'

import { Message } from '../types'
import { PUBLIC_URL } from '../../config'

interface NewPromptData {
  serviceId: string
  systemMessage: string
  messages: Message[]
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

  const mutation = useMutation(mutationFn)

  return mutation
}
