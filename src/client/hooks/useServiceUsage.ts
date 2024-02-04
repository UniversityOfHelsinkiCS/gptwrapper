import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { ServiceUsage } from '../types'

export const queryKey = ['serviceUsage']

const useServiceUsage = () => {
  const queryFn = async (): Promise<ServiceUsage[]> => {
    const res = await fetch(`${PUBLIC_URL}/api/admin/services/usage`)

    const data = await res.json()

    return data
  }

  const { data: usage, ...rest } = useQuery({ queryKey, queryFn })

  return { usage: usage || [], ...rest }
}

export default useServiceUsage
