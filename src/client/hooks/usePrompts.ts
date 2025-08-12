import { useQuery } from '@tanstack/react-query'

import { Prompt } from '../types'
import apiClient from '../util/apiClient'

export const queryKey = ['prompts']

const usePrompts = (courseId: string) => {
  const queryFn = async (): Promise<Prompt[]> => {
    const res = await apiClient.get(`/prompts/for-course/${courseId}`)

    const { data } = res

    return data
  }

  const { data: prompts, ...rest } = useQuery({ queryKey, queryFn, select: (data) => data.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)) })

  return { prompts: prompts || [], ...rest }
}

export default usePrompts
