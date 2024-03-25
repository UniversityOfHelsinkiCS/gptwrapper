import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { ChatInstance } from '../types'

const useChatInstance = (id: string) => {
  const queryKey = ['chatInstance', id]

  const queryFn = async (): Promise<ChatInstance | null> => {
    const res = await fetch(`${PUBLIC_URL}/api/chatinstances/${id}`)

    const data = await res.json()

    return data
  }

  const { data: chatInstance, ...rest } = useQuery({ queryKey, queryFn })

  return { chatInstance, ...rest }
}

export default useChatInstance
