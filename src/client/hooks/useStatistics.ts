import { useQuery } from '@tanstack/react-query'

import { StatisticResponse } from '../types'
import apiClient from '../util/apiClient'

const useStatistics = () => {
  const queryKey = ['statistics']

  const queryFn = async () => {
    const res = await apiClient.get<StatisticResponse>(`/statistics/statistics`)

    const { data } = res

    return data
  }

  return useQuery({ queryKey, queryFn })
}

export default useStatistics
