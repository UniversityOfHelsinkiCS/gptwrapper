import { useQuery } from '@tanstack/react-query'

import { User } from '../types'
import apiClient from '../util/apiClient'

export const queryKey = ['usersearch']

const useUserSearch = (search: string) => {
  const queryFn = async (): Promise<User[]> => {
    const res = await apiClient.get(`/admin/users/${search}`)

    const { data } = res

    return data
  }

  const { data: users, ...rest } = useQuery({
    queryKey,
    queryFn,
    enabled: search.length > 4,
  })

  return { users: search.length > 4 ? users : [] || [], ...rest }
}

export default useUserSearch
