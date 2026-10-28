import { useQuery } from '@tanstack/react-query'

import type { ApiUser } from '../../shared/types'
import apiClient from '../util/apiClient'

const useApiUsers = () => {
  const queryKey = ['apiUsers']

  const queryFn = async (): Promise<ApiUser[]> => {
    const res = await apiClient.get('/admin/api-users')

    const { data } = res

    return data
  }

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn,
  })

  return { data, ...rest }
}

export default useApiUsers
