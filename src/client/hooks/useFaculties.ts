import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { Faculty } from '../types'

export const queryKey = ['faculties']

const useFaculties = () => {
  const queryFn = async (): Promise<Faculty[]> => {
    const res = await fetch(`${PUBLIC_URL}/api/faculties`)

    const data = await res.json()

    return data
  }

  const { data: faculties, ...rest } = useQuery({ queryKey, queryFn })

  return { faculties, ...rest }
}

export default useFaculties
