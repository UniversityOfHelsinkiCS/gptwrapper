import { useQuery } from '@tanstack/react-query'

import { Course } from '../types'
import apiClient from '../util/apiClient'

const queryKey = ['chatInstances']

const useUserCourses = () => {
  const queryFn = async (): Promise<Course[]> => {
    const res = await apiClient.get(`/courses/user`)

    const { data } = res

    return data
  }

  const { data: courses, ...rest } = useQuery({
    queryKey,
    queryFn,
  })

  return { courses: courses || [], ...rest }
}

export default useUserCourses
