import { useQuery } from '@tanstack/react-query'

import apiClient from '../util/apiClient'
import { InfoText } from '../types'

const queryKey = ['infotexts']

const useInfoTexts = () => {
  const queryFn = async (): Promise<InfoText[]> => {
    const res = await apiClient.get(`/infotexts`)

    const { data } = res

    return data
  }

  const { data: infoTexts, ...rest } = useQuery({ queryKey, queryFn })

  return { infoTexts, ...rest }
}

export default useInfoTexts
