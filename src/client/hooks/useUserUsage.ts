import { useQuery } from '@tanstack/react-query'
import { CourseUsage } from '@shared/types'

import apiClient from '../util/apiClient'
import queryClient from '../util/queryClient'

export type UserUsageInfo = {
  limit: number
  courses: CourseUsage[]
}

export const userUsageQueryKey = ['user-usage'] as const

export const invalidateUserUsage = (): Promise<void> => queryClient.invalidateQueries({ queryKey: userUsageQueryKey })

const useUserUsages = () => {
  const queryKey = userUsageQueryKey

  const queryFn = async (): Promise<UserUsageInfo> => {
    const res = await apiClient.get('/users/status/all')

    const { data } = res

    return data
  }

  const { data: usageInfo, ...rest } = useQuery({ queryKey, queryFn })

  return { usageInfo, ...rest }
}

export default useUserUsages
