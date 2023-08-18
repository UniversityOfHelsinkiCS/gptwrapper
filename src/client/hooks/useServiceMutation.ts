import { useMutation } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { Message } from '../types'
import queryClient from '../util/queryClient'
import { queryKey } from './useServices'

interface NewServiceData {
  name: string
  description: string
  model: string
  usageLimit: number
  courseId: string
  prompt: Message[]
}

export const useCreateServiceMutation = () => {
  const mutationFn = async (data: NewServiceData) => {
    const res = await fetch(`${PUBLIC_URL}/api/admin/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const service = await res.json()

    return service
  }

  const mutation = useMutation(mutationFn, {
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey,
      }),
  })

  return mutation
}