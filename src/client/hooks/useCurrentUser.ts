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
    // multiple components mount this hook.
    // staleTime ensures that the data is not refetched
    // unnecessarily within a short period of time.
    staleTime: 5000,
    retry: (failureCount, error) => {
      const status = (error as ApiError).response?.status
      if (status && status >= 400 && status < 500) return false
      return failureCount < 2
    },
  })

  return { user, ...rest }
}

export default useCurrentUser
