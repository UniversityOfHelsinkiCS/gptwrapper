import { useQuery } from '@tanstack/react-query'

import { Course, CourseStatistics } from '../types'
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

export const useCourseStatistics = (courseId?: string) => {
  const queryKey = ['statistics', courseId]

  const queryFn = async (): Promise<CourseStatistics | null> => {
    const res = await apiClient.get(`/courses/statistics/${courseId}`)

    const { data } = res

    return data
  }

  const { data: stats, ...rest } = useQuery({
    queryKey,
    queryFn,
    enabled: !!courseId,
  })

  return { stats, ...rest }
}

export default useCourse
