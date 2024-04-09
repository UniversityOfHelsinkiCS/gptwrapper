import { useQuery } from '@tanstack/react-query'

import { ChatInstance } from '../types'
import apiClient from '../util/apiClient'

const useChatInstance = (id: string) => {
  const queryKey = ['chatInstance', id]

  const queryFn = async (): Promise<ChatInstance | null> => {
    const res = await apiClient.get(`/chatinstances/${id}`)

    const { data } = res

    return data
  }

  const { data: chatInstance, ...rest } = useQuery({ queryKey, queryFn })

  return { chatInstance, ...rest }
}

export default useChatInstance
