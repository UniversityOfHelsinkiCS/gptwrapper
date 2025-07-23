import * as Sentry from '@sentry/react'
import { useQuery } from '@tanstack/react-query'

import type { User } from '../types'
import apiClient from '../util/apiClient'

const queryKey = ['login']

const useCurrentUser = () => {
  const queryFn = async () => {
    const res = await apiClient.get<User>(`/users/login`)

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
  })

  return { user, ...rest }
}

export default useCurrentUser
