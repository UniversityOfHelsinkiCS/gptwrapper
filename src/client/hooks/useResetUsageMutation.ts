import { useMutation } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import queryClient from '../util/queryClient'
import { queryKey } from './useUsers'

const useResetUsageMutation = () => {
  const mutationFn = async (userId: string) => {
    const res = await fetch(`${PUBLIC_URL}/api/admin/usage/${userId}`, {
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

export default useResetUsageMutation
