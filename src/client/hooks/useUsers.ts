import { useQuery } from '@tanstack/react-query'

import { User } from '../types'
import apiClient from '../util/apiClient'

export const queryKey = ['users']

const useUsers = () => {
  const queryFn = async (): Promise<User[]> => {
    const res = await apiClient.get(`/admin/users`)

    const { data } = res

    return data
  }

  const { data: users, ...rest } = useQuery({ queryKey, queryFn })

  return { users: users || [], ...rest }
}

export default useUsers
