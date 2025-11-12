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

  const queryFn = async (): Promise<CoursesViewCourse[]> => {
    const res = await apiClient.get(`/courses/user`)

    const courses = _.orderBy(res.data, ['isActive', 'isExpired'], ['desc', 'asc'])
    return courses
  }

  const { data, ...rest } = useQuery({
    queryKey,
    queryFn,
    placeholderData: keepPreviousData,
  })

  return { courses: data, ...rest }
}

export default useUserCourses
