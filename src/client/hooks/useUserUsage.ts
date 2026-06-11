import { useQuery } from '@tanstack/react-query'
import { CourseUsage } from '@shared/types'

import apiClient from '../util/apiClient'

export type UserUsageInfo = {
  limit: number
  courses: CourseUsage[]
}

const useUserUsages = () => {
  const queryKey = ['user-usage']

  const queryFn = async (): Promise<UserUsageInfo> => {
    const res = await apiClient.get('/users/status/all')

    const { data } = res

    return data
  }

  const { data: usageInfo, ...rest } = useQuery({ queryKey, queryFn })

  return { usageInfo, ...rest }
}

export default useUserUsages
