import { useQuery } from '@tanstack/react-query'

import { ChatInstanceUsage } from '../types'
import apiClient from '../util/apiClient'

const useChatInstanceUsage = () => {
  const queryKey = ['chatInstanceUsage']

  const queryFn = async (): Promise<ChatInstanceUsage[]> => {
    const res = await apiClient.get(`/admin/chatinstances/usage`)

    const { data } = res

    return data
  }

  const { data: usage, ...rest } = useQuery({ queryKey, queryFn })

  return { usage: usage || [], ...rest }
}

export const useCourseUsage = (chatInstanceId?: string) => {
  const queryKey = ['courseUsage', chatInstanceId]

  const queryFn = async (): Promise<ChatInstanceUsage[] | null> => {
    const res = await apiClient.get(`/chatinstances/${chatInstanceId}/usages`)

    const { data } = res

    return data
  }

  const { data: chatInstanceUsages, ...rest } = useQuery({
    queryKey,
    queryFn,
    enabled: !!chatInstanceId,
  })

  return { chatInstanceUsages, ...rest }
}

export default useChatInstanceUsage
