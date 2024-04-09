import { useMutation } from '@tanstack/react-query'

import queryClient from '../util/queryClient'
import { queryKey } from './useChatInstanceUsage'
import apiClient from '../util/apiClient'

export const useDeleteChatInstanceUsageMutation = () => {
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
