import { useQuery } from '@tanstack/react-query'

import { PUBLIC_URL } from '../../config'
import { Course } from '../types'

export const queryKey = ['chatInstances']

const useUserCourses = () => {
  const queryFn = async (): Promise<Course[]> => {
    const res = await fetch(`${PUBLIC_URL}/api/courses/user`)

    const data = await res.json()

    return data
  }

  const { data: courses, ...rest } = useQuery({
    queryKey,
    queryFn,
  })

  return { courses: courses || [], ...rest }
}

export default useUserCourses
