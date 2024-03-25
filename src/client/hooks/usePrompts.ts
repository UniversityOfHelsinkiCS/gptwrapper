import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { Prompt } from '../types'

export const queryKey = ['prompts']

const usePrompts = (chatInstanceId: string) => {
  const queryFn = async (): Promise<Prompt[]> => {
    const res = await fetch(`${PUBLIC_URL}/api/prompts/${chatInstanceId}`)

    const data = await res.json()

    return data
  }

  const { data: prompts, ...rest } = useQuery({ queryKey, queryFn })

  return { prompts: prompts || [], ...rest }
}

export default usePrompts
