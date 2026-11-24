import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { SortOrder, UsageComparisonResponse, UsageComparisonSortKey } from '@shared/usage'
import apiClient from '../util/apiClient'

export const queryKey = ['admin', 'usage-comparison']

export type UsageComparisonParams = {
  orderBy: UsageComparisonSortKey
  order: SortOrder
  limit: number
  offset: number
}

/** One page of the usage comparison. The previous page stays shown while the next one loads. */
const useUsageComparison = (params: UsageComparisonParams) => {
  const queryFn = async (): Promise<UsageComparisonResponse> => {
    const res = await apiClient.get<UsageComparisonResponse>('/admin/usage-comparison', { params })

    return res.data
  }

  const { data, ...rest } = useQuery({ queryKey: [...queryKey, params], queryFn, placeholderData: keepPreviousData })

  return { rows: data?.results, count: data?.count, ...rest }
}

export default useUsageComparison
