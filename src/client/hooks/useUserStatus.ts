import { useQuery } from '@tanstack/react-query'

import { UserStatus } from '../types'
import apiClient from '../util/apiClient'

const useUserStatus = (chatInstanceId: string) => {
  const queryKey = ['status', chatInstanceId]

  const queryFn = async (): Promise<UserStatus> => {
    const res = await apiClient.get(`/users/status/${chatInstanceId}`)

    const { data } = res

    return data
  }

  const { data: userStatus, ...rest } = useQuery({ queryKey, queryFn })

  return { userStatus, ...rest }
}

export default useUserStatus
