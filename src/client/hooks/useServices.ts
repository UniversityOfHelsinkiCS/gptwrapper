import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { ChatInstance } from '../types'

export const queryKey = ['services']

const useServices = () => {
  const queryFn = async (): Promise<ChatInstance[]> => {
    const res = await fetch(`${PUBLIC_URL}/api/chatinstances`)

    const data = await res.json()

    return data
  }

  const { data: services, ...rest } = useQuery({ queryKey, queryFn })

  return { services: services || [], ...rest }
}

export default useServices
