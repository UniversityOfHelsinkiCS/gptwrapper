import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { Service } from '../types'

export const queryKey = ['services']

const useUserCourses = (userId?: string) => {
  const queryFn = async (): Promise<Service[]> => {
    const res = await fetch(`${PUBLIC_URL}/api/courses/user/${userId}`)

    const data = await res.json()

    return data
  }

  const { data: courses, ...rest } = useQuery({
    queryKey,
    queryFn,
    enabled: !!userId,
  })

  return { courses: courses || [], ...rest }
}

export default useUserCourses
