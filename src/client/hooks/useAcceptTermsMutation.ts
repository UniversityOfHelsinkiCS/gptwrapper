import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../util/apiClient'

export const useAcceptTermsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/users/accept-terms')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['login'] })
    },
  })
}
