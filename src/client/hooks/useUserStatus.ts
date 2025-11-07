import { useQuery } from '@tanstack/react-query'

import { UserStatus } from '../types'
import apiClient from '../util/apiClient'

const useUserStatus = (courseId?: string) => {
  const queryKey = ['user-status']
  if (courseId) queryKey.push(courseId)

  const queryFn = async (): Promise<UserStatus> => {
    const res = await apiClient.get(courseId ? `/users/status/${courseId}` : '/users/status')

    const { data } = res

    return data
  }

  const { data: userStatus, ...rest } = useQuery({ queryKey, queryFn, enabled: courseId !== 'general' })

  return { userStatus, ...rest }
}

export default useUserStatus
