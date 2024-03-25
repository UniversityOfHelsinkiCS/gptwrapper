import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { ChatInstanceUsage } from '../types'

export const queryKey = ['serviceUsage']

const useChatInstanceUsage = () => {
  const queryFn = async (): Promise<ChatInstanceUsage[]> => {
    const res = await fetch(`${PUBLIC_URL}/api/admin/chatinstances/usage`)

    const data = await res.json()

    return data
  }

  const { data: usage, ...rest } = useQuery({ queryKey, queryFn })

  return { usage: usage || [], ...rest }
}

export default useChatInstanceUsage
