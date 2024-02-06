import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { User } from '../types'

export const queryKey = ['users']

const useUsers = () => {
  const queryFn = async (): Promise<User[]> => {
    const res = await fetch(`${PUBLIC_URL}/api/admin/users`)

    const data = await res.json()

    return data
  }

  const { data: users, ...rest } = useQuery({ queryKey, queryFn })

  return { users: users || [], ...rest }
}

export default useUsers
