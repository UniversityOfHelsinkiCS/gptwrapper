import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { UserStatus } from '../types'

const useUserStatus = (serviceId: string = 'chat') => {
  const queryKey = ['status', serviceId]

  const queryFn = async (): Promise<UserStatus> => {
    const res = await fetch(`${PUBLIC_URL}/api/users/${serviceId}/status`)

    const data = await res.json()

    return data
  }

  const { data: userStatus, ...rest } = useQuery({ queryKey, queryFn })

  return { userStatus, ...rest }
}

export default useUserStatus
