import { useQuery } from '@tanstack/react-query'

import { ChatInstance } from '../types'
import apiClient from '../util/apiClient'

export const queryKey = ['chatInstances']

const useChatInstances = () => {
  const queryFn = async (): Promise<ChatInstance[]> => {
    const res = await apiClient.get(`/chatinstances`)

    const { data } = res

    return data
  }

  const { data: chatInstances, ...rest } = useQuery({ queryKey, queryFn })

  return { chatInstances: chatInstances || [], ...rest }
}

export default useChatInstances
