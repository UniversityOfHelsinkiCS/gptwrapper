import { useQuery } from '@tanstack/react-query'

import { Prompt } from '../types'
import apiClient from '../util/apiClient'

export const queryKey = ['prompts']

const usePrompts = (chatInstanceId: string) => {
  const queryFn = async (): Promise<Prompt[]> => {
    const res = await apiClient.get(`/prompts/${chatInstanceId}`)

    const { data } = res

    return data
  }

  const { data: prompts, ...rest } = useQuery({ queryKey, queryFn })

  return { prompts: prompts || [], ...rest }
}

export default usePrompts
