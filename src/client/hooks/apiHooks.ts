import { type UseQueryOptions, useQuery } from '@tanstack/react-query'
import apiClient from '../util/apiClient'

type UseGetQueryOptions<T> = Omit<UseQueryOptions<T>, 'queryFn'> & {
  url: string
}

/**
 * Abstraction over the very common use-case of using axios apiClient to get data using react-query useQuery
 */
export const useGetQuery = <T>(options: UseGetQueryOptions<T>) => {
  const fetchQuery = async () => {
    const res = await apiClient.get<T>(options.url)
    return res.data
  }

  return useQuery({
    ...options,
    queryFn: fetchQuery,
  })
}
