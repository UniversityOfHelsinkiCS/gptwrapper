import * as Sentry from '@sentry/react'
import { useQuery } from '@tanstack/react-query'

import type { User } from '../types'
import apiClient from '../util/apiClient'
import type { ApiError } from '../util/apiClient'

const queryKey = ['login']

const useCurrentUser = () => {
  const queryFn = async () => {
    const res = await apiClient.get<User>(`/users/login`, {
      validateStatus: (status) => status === 200 || status === 401,
    })

    if (res.status === 401) return null

    const { data: user } = res

    Sentry.setUser({
      id: user.id,
      username: user.username,
      email: user.primaryEmail,
    })

    return user
  }

  const { data: user, ...rest } = useQuery({
    queryKey,
    queryFn,
    // The login data does not change during a session, so we fetch it once.
    // Session liveness is handled by initShibbolethPinger in App.tsx.
    // Mutations that change the user (preferences, terms) update the cache with setQueryData.
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const status = (error as ApiError)?.response?.status
      if (status && status >= 400 && status < 500) return false
      return failureCount < 2
    },
  })

  return { user, ...rest }
}

export default useCurrentUser
