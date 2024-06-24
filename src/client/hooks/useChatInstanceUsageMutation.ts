import { useMutation } from '@tanstack/react-query'

import queryClient from '../util/queryClient'
import apiClient from '../util/apiClient'

export const useDeleteChatInstanceUsageMutation = () => {
  const queryKey = ['chatInstanceUsage']
  const mutationFn = async (id: string) => {
    const res = await apiClient.delete(`/admin/chatinstances/usage/${id}`)

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

export const useResetChatInstanceUsageMutation = () => {
  const queryKey = ['courseUsage']
  const mutationFn = async (id: string) => {
    const res = await apiClient.delete(`/chatinstances/usage/${id}`)

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
