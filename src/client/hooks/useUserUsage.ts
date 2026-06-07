import { useQuery } from '@tanstack/react-query'

import apiClient from '../util/apiClient'

const useUserUsages = () => {
  const queryKey = ['user-usage']

  const queryFn = async () => {
    const res = await apiClient.get('/users/status/all')

    const { data } = res

    return data
  }

  const { data: usageInfo, ...rest } = useQuery({ queryKey, queryFn })

  return { usageInfo, ...rest }
}

export default useUserUsages
