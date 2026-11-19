import { useQuery } from '@tanstack/react-query'

import type { UsageComparisonResponse } from '@shared/usage'
import apiClient from '../util/apiClient'

export const queryKey = ['admin', 'usage-comparison']

const useUsageComparison = () => {
  const queryFn = async (): Promise<UsageComparisonResponse> => {
    const res = await apiClient.get('/admin/usage-comparison')

    return res.data
  }

  const { data: rows, ...rest } = useQuery({ queryKey, queryFn })

  return { rows, ...rest }
}

export default useUsageComparison
