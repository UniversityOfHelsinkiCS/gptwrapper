import { useMutation } from '@tanstack/react-query'

import queryClient from '../util/queryClient'
import { queryKey } from './useUsers'
import apiClient from '../util/apiClient'

const useResetUsageMutation = () => {
  const mutationFn = async (userId: string) => {
    const res = await apiClient.delete(`/admin/usage/${userId}`)

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

export default useResetUsageMutation
