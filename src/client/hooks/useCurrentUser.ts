import { useQuery } from '@tanstack/react-query'

import { User } from '../types'
import apiClient from '../util/apiClient'

const useLoggedInUser = () => {
  const queryKey = ['user']

  const queryFn = async (): Promise<User> => {
    const { data } = await apiClient.get('/users/status')

    return data
  }

  const { data: user, ...rest } = useQuery({ queryKey, queryFn })

  return { user, ...rest }
}

export default useLoggedInUser
