import { useMutation } from '@tanstack/react-query'

import queryClient from '../util/queryClient'
import apiClient from '../util/apiClient'
import type { ResetAllUsageResponse } from '@shared/usage'

const useResetUsageMutation = () => {
  const mutationFn = async (userId: string) => {
    const res = await apiClient.delete(`/admin/usage/${userId}`)

    return res
  }

  return useMutation({ mutationFn })
}

export default useResetUsageMutation

/** Resets this week's usage of all users. Everything usage-related may change, so all queries are refetched. */
export const useResetAllUsageMutation = () =>
  useMutation({
    mutationFn: async () => {
      const res = await apiClient.delete<ResetAllUsageResponse>('/admin/usage')
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries(),
  })
