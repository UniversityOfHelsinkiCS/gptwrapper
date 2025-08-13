import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../util/apiClient'
import type { User, UserPreferences } from '../../shared/user'

export const usePreferencesUpdateMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (preferences: UserPreferences) => {
      // Optimistic update. It is safe to update preferences without waiting for server validation.
      queryClient.setQueryData(['login'], (oldData: User) => ({
        ...oldData,
        preferences: {
          ...oldData.preferences,
          ...preferences,
        },
      }))

      const response = await apiClient.put<UserPreferences>('/users/preferences', preferences)
      return response.data
    },
  })
}
