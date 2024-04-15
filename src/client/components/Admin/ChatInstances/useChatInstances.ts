import { useQuery } from '@tanstack/react-query'

import { ChatInstance } from '../../../types'
import apiClient from '../../../util/apiClient'

const useChatInstances = ({ limit = 100, offset = 0, search = '' }) => {
  const queryKey = ['chatInstances', { limit, offset, search }]

  const queryFn = async (): Promise<{
    chatInstances: ChatInstance[]
    count: number
  }> => {
    const res = await apiClient.get(
      `/chatinstances?limit=${limit}&offset=${offset}&search=${search}`
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
