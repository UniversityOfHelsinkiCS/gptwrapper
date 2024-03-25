import { useMutation } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import queryClient from '../util/queryClient'
import { queryKey } from './useChatInstances'

interface NewChatInstanceData {
  name: string
  description: string
  model: string
  usageLimit: number
  courseId: string
}

export const useCreateChatInstanceMutation = () => {
  const mutationFn = async (data: NewChatInstanceData) => {
    const res = await fetch(`${PUBLIC_URL}/api/admin/chatinstances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const chatInstance = await res.json()

    return chatInstance
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

interface UpdatedChatInstanceData {
  id: string
  name: string
  description: string
  model: string
  usageLimit: number
  courseId?: string
}

export const useEditChatInstanceMutation = () => {
  const mutationFn = async (data: UpdatedChatInstanceData) => {
    const res = await fetch(
      `${PUBLIC_URL}/api/admin/chatinstances/${data.id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    )

    const chatInstance = await res.json()

    return chatInstance
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

export const useDeleteChatInstanceMutation = () => {
  const mutationFn = async (id: string) => {
    const res = await fetch(`${PUBLIC_URL}/api/admin/chatinstances/${id}`, {
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
