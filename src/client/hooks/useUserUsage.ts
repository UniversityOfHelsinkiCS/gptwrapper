import { useQuery } from '@tanstack/react-query'

import { UserStatus } from '../types'
import apiClient from '../util/apiClient'

const useUserUsages = () => {
  const queryKey = ['user-usage']

  const queryFn = async (): Promise<UserStatus> => {
    const res = await apiClient.get('/users/status/all')

    const { data } = res

    return data
  }

  const { data: userStatus2, ...rest } = useQuery({ queryKey, queryFn })

  return { userStatus2, ...rest }
}

export default useUserUsages
