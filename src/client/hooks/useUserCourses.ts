import { keepPreviousData, useQuery } from '@tanstack/react-query'
import _ from 'lodash'

import { Course } from '../types'
import apiClient from '../util/apiClient'

export type CoursesViewCourse = {
  isActive: boolean
  isExpired: boolean
} & Course

const useUserCourses = () => {
  const queryKey = ['chatInstances', 'user']

  const queryFn = async (): Promise<{
    courses: CoursesViewCourse[]
    count: number
  }> => {
    const res = await apiClient.get(`/courses/user`)

    const { data } = res

    const courses = _.orderBy(data?.courses ?? [], ['isActive', 'isExpired'], ['desc', 'asc'])
    const count = data?.count || 0
    return { courses, count }
  }

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn,
    placeholderData: keepPreviousData,
  })

  return { courses: data?.courses, count: data?.count, ...rest }
}

export default useUserCourses
