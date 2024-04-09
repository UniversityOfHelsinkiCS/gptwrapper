import { useQuery } from '@tanstack/react-query'

import { Faculty } from '../types'
import apiClient from '../util/apiClient'

export const queryKey = ['faculties']

const useFaculties = () => {
  const queryFn = async (): Promise<Faculty[]> => {
    const res = await apiClient.get(`/faculties`)

    const { data } = res

    return data
  }

  const { data: faculties, ...rest } = useQuery({ queryKey, queryFn })

  return { faculties, ...rest }
}

export default useFaculties
