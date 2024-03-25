import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { ChatInstance } from '../types'

export const queryKey = ['chatInstances']

const useChatInstances = () => {
  const queryFn = async (): Promise<ChatInstance[]> => {
    const res = await fetch(`${PUBLIC_URL}/api/chatinstances`)

    const data = await res.json()

    return data
  }

  const { data: chatInstances, ...rest } = useQuery({ queryKey, queryFn })

  return { chatInstances: chatInstances || [], ...rest }
}

export default useChatInstances
