import { useQuery } from '@tanstack/react-query'

import { Course } from '../types'
import apiClient from '../util/apiClient'

const useCourse = (courseId?: string) => {
  const queryKey = ['course', courseId]

  const queryFn = async (): Promise<Course | null> => {
    const res = await apiClient.get(`/courses/${courseId}`)

    const { data } = res

    return data
  }

  const { data: course, ...rest } = useQuery({
    queryKey,
    queryFn,
    enabled: !!courseId,
  })

  return { course, ...rest }
}

export default useCourse
