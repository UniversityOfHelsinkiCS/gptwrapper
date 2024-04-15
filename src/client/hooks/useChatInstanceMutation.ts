import { useMutation } from '@tanstack/react-query'

import queryClient from '../util/queryClient'
import { queryKey } from './useChatInstances'
import apiClient from '../util/apiClient'

interface NewChatInstanceData {
  name: string
  description: string
  model: string
  usageLimit: number
  courseId: string
}

export const useCreateChatInstanceMutation = () => {
  const mutationFn = async (data: NewChatInstanceData) => {
    const res = await apiClient.post(`/admin/chatinstances`, data)

    const chatInstance = res.data

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
    const res = await apiClient.put(`/admin/chatinstances/${data.id}`, data)

    const chatInstance = res.data

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
    const res = await apiClient.delete(`/admin/chatinstances/${id}`)

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
