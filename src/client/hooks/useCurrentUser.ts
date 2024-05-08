import { useQuery } from '@tanstack/react-query'

import { User } from '../types'
import apiClient from '../util/apiClient'

const queryKey = ['login']

const useCurrentUser = () => {
  const queryFn = async (): Promise<User | null> => {
    const res = await apiClient.get(`/users/login`)

    if (res.status === 401) return null

    const { data } = res

    return data
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
