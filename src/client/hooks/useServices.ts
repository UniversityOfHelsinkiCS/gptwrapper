import { useQuery } from '@tanstack/react-query'

import { Service } from '../types'

export const queryKey = ['services']

const useServices = () => {
  const queryFn = async (): Promise<Service[]> => {
    const res = await fetch('/api/services')

    const data = await res.json()

    return data
  }

  const { data: services, ...rest } = useQuery(queryKey, queryFn)

  return { services: services || [], ...rest }
}

export default useServices
