import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { ChatInstanceSearchResult } from '@shared/types'
import apiClient from '../../../util/apiClient'

export const CHAT_INSTANCE_SEARCH_MIN_LENGTH = 3

const useChatInstanceSearch = (search: string, language: string) => {
  const queryKey = ['chatInstanceSearch', search, language]

  const queryFn = async (): Promise<ChatInstanceSearchResult[]> => {
    const res = await apiClient.get<ChatInstanceSearchResult[]>(`/admin/chatinstance-search?search=${encodeURIComponent(search)}&language=${language}`)

    const { data } = res

    return data
  }

  return useQuery({
    queryKey,
    queryFn,
    enabled: search.length >= CHAT_INSTANCE_SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
  })
}

export default useChatInstanceSearch
