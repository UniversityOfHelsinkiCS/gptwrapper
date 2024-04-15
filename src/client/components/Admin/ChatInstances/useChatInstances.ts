import { useQuery } from '@tanstack/react-query'

import { ChatInstance } from '../../../types'
import apiClient from '../../../util/apiClient'

const useChatInstances = ({ limit = 100, offset = 0 }) => {
  const queryKey = ['chatInstances', { limit, offset }]

  const queryFn = async (): Promise<ChatInstance[]> => {
    const res = await apiClient.get(
      `/chatinstances?limit=${limit}&offset=${offset}`
    )

    const { data } = res

    return data
  }

  const { data: chatInstances, ...rest } = useQuery({ queryKey, queryFn })

  return { chatInstances: chatInstances || [], ...rest }
}

export default useChatInstances
