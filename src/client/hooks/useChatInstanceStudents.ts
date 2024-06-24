import { useMutation, useQuery } from '@tanstack/react-query'

import { ChatInstanceUsage } from '../types'
import apiClient from '../util/apiClient'
import queryClient from '../util/queryClient'

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

export const useResetChatInstanceUsageMutation = () => {
  const queryKey = ['courseUsage']
  const mutationFn = async (id: string) => {
    const res = await apiClient.delete(`/chatinstances/usage/${id}`)

    return res
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey,
      }),
  })

  return mutation
}
