import { useQuery } from '@tanstack/react-query'

import { AccessGroup } from '../types'

export const queryKey = ['accessGroups']

const useAccessGroups = () => {
  const queryFn = async (): Promise<AccessGroup[]> => {
    const res = await fetch('/api/admin/accessGroups')

    const data = await res.json()

    return data
  }

  const { data: accessGroups, ...rest } = useQuery(queryKey, queryFn)

  return { accessGroups: accessGroups || [], ...rest }
}

export default useAccessGroups
