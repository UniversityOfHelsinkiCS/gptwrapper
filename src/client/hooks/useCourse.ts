import { useQuery } from '@tanstack/react-query'
import type { Discussion } from '../../shared/types'
import type { Course, CourseStatistics, Enrolment } from '../types'
import apiClient from '../util/apiClient'
import { useGetQuery } from './apiHooks'

const useCourse = (courseId?: string) => {
  const queryKey = ['course', courseId]

  const queryFn = async () => {

    const res = await apiClient.get<Course>(`/courses/${courseId}`)

    const { data } = res

    return data
  }

  return useQuery({
    queryKey,
    queryFn,
    enabled: courseId !== 'general',
    retry: false,
  })
}

export const useCourseEnrolments = (courseId?: string) => {
  const queryKey = ['enrolments', courseId]

  const queryFn = async () => {
    const res = await apiClient.get<Enrolment[]>(`/courses/${courseId}/enrolments`)

    const { data } = res

    return data
  }

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!courseId,
  })
}

export const useCourseDiscussers = (courseId?: string) => {
  const queryKey = ['discussers', courseId]

  const queryFn = async (): Promise<any | null> => {
    const res = await apiClient.get(`/courses/${courseId}/discussers`)

    const { data } = res

    return data
  }

  const { data: discussers, ...rest } = useQuery({
    queryKey,
    queryFn,
    enabled: !!courseId,
  })

  return { discussers, ...rest }
}

export const useCourseDiscussion = (courseId?: string, userId?: string) => {
  const queryKey = ['messages', courseId, userId]

  return useGetQuery<Discussion[]>({
    queryKey,
    url: `/courses/${courseId}/discussions/${userId}`,
    enabled: !!courseId,
  })
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

export interface DailyUsage {
  date: string
  count: number
}

export const useCourseDailyUsage = (courseId?: string) => {
  const queryKey = ['dailyUsage', courseId]

  const queryFn = async (): Promise<DailyUsage[]> => {
    const res = await apiClient.get(`/courses/statistics/${courseId}/daily`)

    const { data } = res

    return data
  }

  const { data: dailyUsage, ...rest } = useQuery({
    queryKey,
    queryFn,
    enabled: !!courseId,
  })

  return { dailyUsage, ...rest }
}

export default useCourse
