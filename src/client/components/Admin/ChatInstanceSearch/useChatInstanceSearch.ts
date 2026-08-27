import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { ChatInstanceSearchResponse } from '@shared/types'
import apiClient from '../../../util/apiClient'

export const CHAT_INSTANCE_SEARCH_MIN_LENGTH = 3
export const CHAT_INSTANCE_SEARCH_DEFAULT_LIMIT = 25

const useChatInstanceSearch = ({
  search,
  language,
  limit = CHAT_INSTANCE_SEARCH_DEFAULT_LIMIT,
  offset = 0,
}: {
  search: string
  language: string
  limit?: number
  offset?: number
}) => {
  const queryKey = ['chatInstanceSearch', { search, language, limit, offset }]

  const queryFn = async (): Promise<ChatInstanceSearchResponse> => {
    const res = await apiClient.get<ChatInstanceSearchResponse>(
      `/admin/chatinstance-search?search=${encodeURIComponent(search)}&language=${language}&limit=${limit}&offset=${offset}`,
    )

    const { data } = res

    return data
  }

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn,
    enabled: search.length >= CHAT_INSTANCE_SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
  })

  return {
    results: data?.results,
    count: data?.count,
    ...rest,
  }
}

export default useChatInstanceSearch
