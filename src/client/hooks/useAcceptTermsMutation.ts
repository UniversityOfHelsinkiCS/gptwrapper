import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../util/apiClient'

export const useAcceptTermsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Optimistic update
      queryClient.setQueryData(['login'], (oldData: object) => ({
        ...oldData,
        termsAccepted: true,
      }))

      const response = await apiClient.post('/users/accept-terms')
      return response.data
    },
  })
}
