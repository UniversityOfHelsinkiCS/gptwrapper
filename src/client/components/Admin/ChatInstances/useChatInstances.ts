import { useQuery } from '@tanstack/react-query'

import { ChatInstance } from '../../../types'
import apiClient from '../../../util/apiClient'

const useChatInstances = ({
  limit = 100,
  offset = 0,
  search = '',
  order = '',
  orderBy = '',
}) => {
  const queryKey = ['chatInstances', { limit, offset, search, order, orderBy }]

  const queryFn = async (): Promise<{
    chatInstances: ChatInstance[]
    count: number
  }> => {
    const res = await apiClient.get(
      `/chatinstances?limit=${limit}&offset=${offset}&search=${search}&orderBy=${orderBy}&order=${order}`
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
