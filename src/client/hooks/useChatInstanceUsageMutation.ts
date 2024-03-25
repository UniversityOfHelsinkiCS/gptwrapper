import { useMutation } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import queryClient from '../util/queryClient'
import { queryKey } from './useChatInstanceUsage'

export const useDeleteChatInstanceUsageMutation = () => {
  const mutationFn = async (id: string) => {
    const res = await fetch(`${PUBLIC_URL}/api/admin/services/usage/${id}`, {
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
