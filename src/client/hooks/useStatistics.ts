import { useQuery } from '@tanstack/react-query'

import { StatisticResponse } from '../types'
import apiClient from '../util/apiClient'

const useStatistics = () => {
  const queryKey = ['statistics']

  const queryFn = async (): Promise<StatisticResponse> => {
    const res = await apiClient.get(`/admin/statistics`)

    const { data } = res

    return data
  }

  const { data, ...rest } = useQuery({ queryKey, queryFn })

  return { statistics: data, ...rest }
}

export default useStatistics
