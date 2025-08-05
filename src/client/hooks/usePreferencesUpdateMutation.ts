import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../util/apiClient'
import type { UserPreferences } from '../../shared/user'

export const usePreferencesUpdateMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (preferences: UserPreferences) => {
      // Optimistic update. It is safe to update preferences without waiting for server validation.
      queryClient.setQueryData(['login'], (oldData: object) => ({
        ...oldData,
        preferences,
      }))

      const response = await apiClient.post<UserPreferences>('/users/preferences', preferences)
      return response.data
    },
  })
}
