import { useQuery } from '@tanstack/react-query'

import { ActivityPeriod, ChatInstance } from '../../../types'
import apiClient from '../../../util/apiClient'

interface ChatInstanceWithTokens extends ChatInstance {
  activityPeriod: ActivityPeriod
  tokenUsage: number
}

const useChatInstances = ({ limit = 100, offset = 0, search = '', order = '', orderBy = '', showActiveCourses = false }) => {
  const queryKey = ['chatInstances', { limit, offset, search, order, orderBy, showActiveCourses }]

  const queryFn = async (): Promise<{
    chatInstances: ChatInstanceWithTokens[]
    count: number
  }> => {
    const res = await apiClient.get(
      `/chatinstances?limit=${limit}&offset=${offset}&search=${search}&orderBy=${orderBy}&order=${order}&showActiveCourses=${showActiveCourses}`,
    )

    const { data } = res

    return data
  }

  const { data, ...rest } = useQuery({ queryKey, queryFn })

  return {
    chatInstances: data?.chatInstances || [],
    count: data?.count,
    ...rest,
  }
}

export default useChatInstances
