import { useQuery } from '@tanstack/react-query'

import { ChatInstanceUsage } from '../types'
import apiClient from '../util/apiClient'

export const queryKey = ['chatInstanceUsage']

const useChatInstanceUsage = () => {
  const queryFn = async (): Promise<ChatInstanceUsage[]> => {
    const res = await apiClient.get(`/admin/chatinstances/usage`)

    const { data } = res

    return data
  }

  const { data: usage, ...rest } = useQuery({ queryKey, queryFn })

  return { usage: usage || [], ...rest }
}

export default useChatInstanceUsage
