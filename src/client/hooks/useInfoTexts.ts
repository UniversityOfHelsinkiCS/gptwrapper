import { useQuery } from '@tanstack/react-query'

import apiClient from '../util/apiClient'
import { InfoText } from '../types'

const queryKey = ['infoTexts']

const useInfoTexts = () => {
  const queryFn = async (): Promise<InfoText[]> => {
    const res = await apiClient.get(`/infotexts`)

    const { data } = res

    return data
  }

  const { data: infoTexts, isSuccess, ...rest } = useQuery({ queryKey, queryFn })

  return { infoTexts, isSuccess, ...rest }
}

export default useInfoTexts
